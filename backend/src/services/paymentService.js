const { stripe } = require('./stripeClient')
const { notify } = require('./adminNotifications')
const { pool } = require('../db')
const { sendOrderReceipt } = require('./receiptService')

async function createCheckoutSession(req, res) {
  if (!stripe) {
    return res
      .status(500)
      .json({ error: 'Le paiement n’est pas configuré (STRIPE_SECRET_KEY manquant).' })
  }

  const { cartId } = req.body || {}
  if (!cartId) {
    return res.status(400).json({ error: 'cartId est obligatoire.' })
  }

  const { rows } = await pool.query(
    `SELECT
       c.id,
       c.user_id,
       v.id AS "vehicleId",
       v.model_name AS "modelName",
       v.variant_label AS "variantLabel",
       v.base_price::float8 AS "basePrice"
     FROM carts c
     JOIN vehicles v ON v.id = c.vehicle_id
     WHERE c.id = $1 AND c.user_id = $2 AND c.is_validated = false AND c.deleted_at IS NULL`,
    [cartId, req.user.id],
  )
  const cart = rows[0]
  if (!cart) {
    return res.status(404).json({ error: 'Panier introuvable.' })
  }
  if (cart.basePrice == null) {
    return res
      .status(400)
      .json({ error: 'This vehicle is not yet available for online purchase.' })
  }

  const { rows: orderRows } = await pool.query(
    `INSERT INTO orders (user_id, vehicle_id, cart_id, amount, currency, status)
     VALUES ($1, $2, $3, $4, 'GBP', 'pending')
     RETURNING id`,
    [req.user.id, cart.vehicleId, cart.id, cart.basePrice],
  )
  const orderId = orderRows[0].id

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `BMW ${cart.modelName} — ${cart.variantLabel}`,
          },
          unit_amount: Math.round(cart.basePrice * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cart`,
    metadata: { orderId },
  })

  await pool.query(
    'UPDATE orders SET stripe_checkout_session_id = $1 WHERE id = $2',
    [session.id, orderId],
  )

  return res.json({ url: session.url })
}

function verifyWebhookSignature(rawBody, signature) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    const err = new Error('Stripe webhook non configuré (STRIPE_WEBHOOK_SECRET manquant).')
    err.code = 'STRIPE_NOT_CONFIGURED'
    throw err
  }
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET,
  )
}

async function handleCheckoutCompleted(session) {
  const orderId = session.metadata?.orderId
  if (!orderId) {
    console.error('[webhook] session sans metadata.orderId :', session.id)
    return
  }

  const { rows } = await pool.query(
    `UPDATE orders
       SET status = 'paid', stripe_payment_intent_id = $1
     WHERE id = $2 AND status <> 'paid'
     RETURNING *`,
    [session.payment_intent, orderId],
  )
  const order = rows[0]
  if (!order) {
    console.error('[webhook] commande introuvable ou déjà payée :', orderId)
    return
  }

  if (order.cart_id) {
    await pool.query('UPDATE carts SET is_validated = true WHERE id = $1', [order.cart_id])
  }

  notify({
    type: 'new_order',
    message: `Nouvelle commande payée (${order.amount} ${order.currency})`,
    relatedId: order.id,
  })

  sendOrderReceipt(order.id).catch((err) =>
    console.error('[receipt] échec envoi pour order', order.id, err),
  )
}

async function handleChargeRefunded(charge) {
  const refundId = charge.refunds?.data?.[0]?.id || null

  // NOTE IMPORTANTE : l'événement `charge.refunded` doit être ACTIVÉ dans la
  // configuration du webhook côté tableau de bord Stripe (ou `stripe listen`
  // en local) — sinon il n'est jamais délivré, même si ce code le gère.
  const { rows } = await pool.query(
    `UPDATE orders
        SET status = 'refunded', refunded_at = now(), stripe_refund_id = $1
      WHERE stripe_payment_intent_id = $2 AND status = 'paid'
      RETURNING id`,
    [refundId, charge.payment_intent],
  )
  const order = rows[0]
  if (!order) {
    console.error('[webhook] charge.refunded sans commande associée :', charge.id)
    return
  }

  notify({
    type: 'refund',
    message: 'Remboursement de commande effectué',
    relatedId: order.id,
  })
}

async function handleCheckoutExpired(session) {
  const orderId = session.metadata?.orderId
  if (!orderId) {
    return
  }
  await pool.query(
    "UPDATE orders SET status = 'expired' WHERE id = $1 AND status = 'pending'",
    [orderId],
  )
}

module.exports = {
  createCheckoutSession,
  verifyWebhookSignature,
  handleCheckoutCompleted,
  handleCheckoutExpired,
  handleChargeRefunded,
}