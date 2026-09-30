const { stripe } = require('./stripeClient')
const { notify } = require('./adminNotifications')
const { prisma } = require('../db')
const { sendOrderReceipt } = require('./receiptService')
const accessoryService = require('./accessoryService')

// Ligne de règlement « véhicule » : le prix fait toujours foi côté serveur
// (vehicles.base_price), jamais celui envoyé par le frontend.
function vehicleLine(vehicle) {
  return {
    label: `BMW ${vehicle.modelName} — ${vehicle.variantLabel}`,
    amount: Number(vehicle.basePrice),
  }
}

// Un line_item Stripe par ligne : le reçu Stripe détaille ainsi chaque élément
// (véhicule + accessoires) au lieu d'un montant agrégé.
function toStripeLineItems(lines) {
  return lines.map((line) => ({
    price_data: {
      currency: 'gbp',
      product_data: { name: line.label },
      unit_amount: Math.round(line.amount * 100),
    },
    quantity: 1,
  }))
}

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

  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       c.id,
       c.user_id,
       c.configuration_data AS "configurationData",
       v.id AS "vehicleId",
       v.model_name AS "modelName",
       v.variant_label AS "variantLabel",
       v.base_price::float8 AS "basePrice"
     FROM carts c
     JOIN vehicles v ON v.id = c.vehicle_id
     WHERE c.id = $1 AND c.user_id = $2 AND c.is_validated = false AND c.deleted_at IS NULL`,
    cartId,
    req.user.id,
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

  // Les accessoires sont RECHARGÉS DEPUIS LA BASE : le client ne fournit que des
  // ids, jamais un prix. Id inconnu, supprimé, ou rupturé => refus.
  const accessoryIds = cart.configurationData?.accessoryIds
  const { items, missing } = await accessoryService.resolveAccessories(accessoryIds)
  const outOfStock = items.filter((item) => !item.inStock)

  if (missing.length > 0 || outOfStock.length > 0) {
    return res
      .status(400)
      .json({ error: 'One of your selected accessories is no longer available.' })
  }

  const lines = [
    vehicleLine(cart),
    ...items.map((item) => ({ label: item.name, amount: Number(item.price) })),
  ]
  const amount = Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100

  const order = await prisma.orders.create({
    data: {
      user_id: req.user.id,
      vehicle_id: cart.vehicleId,
      cart_id: cart.id,
      amount,
      currency: 'GBP',
      status: 'pending',
    },
    select: { id: true },
  })
  const orderId = order.id

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: toStripeLineItems(lines),
    success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cart`,
    metadata: { orderId },
  })

  await prisma.orders.update({
    where: { id: orderId },
    data: { stripe_checkout_session_id: session.id },
  })

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

// Décrémente le stock des accessoires achetés. SEUL point d'écriture du stock
// dans toute l'application : ici, et seulement après un paiement confirmé.
async function decrementAccessoryStock(order) {
  if (!order.cart_id) return

  const rows = await prisma.$queryRawUnsafe(
    `SELECT configuration_data AS "configurationData" FROM carts WHERE id = $1`,
    order.cart_id,
  )
  const accessoryIds = rows[0]?.configurationData?.accessoryIds
  if (!Array.isArray(accessoryIds) || accessoryIds.length === 0) return

  for (const accessoryId of accessoryIds) {
    try {
      const updated = await accessoryService.decrementStock(accessoryId)
      if (updated && updated.stockQuantity === 0) {
        notify({
          type: 'low_stock',
          message: `${updated.name} is now out of stock.`,
          relatedId: accessoryId,
        })
      }
    } catch (err) {
      // Un échec sur un accessoire ne doit jamais faire échouer le webhook :
      // la commande est déjà payée, Stripe considèrerait sinon l'événement
      // comme non traité et le rejouerait indéfiniment.
      console.error(
        `[webhook] décrément stock impossible pour l'accessoire ${accessoryId} :`,
        err.message,
      )
    }
  }
}

async function handleCheckoutCompleted(session) {
  const orderId = session.metadata?.orderId
  if (!orderId) {
    console.error('[webhook] session sans metadata.orderId :', session.id)
    return
  }

  // CTE "data-modifying" : met à jour la commande et la renvoie en une seule
  // requête atomique (équivalent de l'ancien UPDATE ... RETURNING *).
  const rows = await prisma.$queryRawUnsafe(
    `WITH updated AS (
       UPDATE orders
          SET status = 'paid', stripe_payment_intent_id = $1
        WHERE id = $2 AND status <> 'paid'
        RETURNING *
     )
     SELECT * FROM updated`,
    session.payment_intent,
    orderId,
  )
  const order = rows[0]
  if (!order) {
    console.error('[webhook] commande introuvable ou déjà payée :', orderId)
    return
  }

  if (order.cart_id) {
    await prisma.carts.updateMany({ where: { id: order.cart_id }, data: { is_validated: true } })
  }

  // Après le marquage « paid » : on décrémente le stock des accessoires.
  await decrementAccessoryStock(order)

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
  const rows = await prisma.$queryRawUnsafe(
    `WITH updated AS (
       UPDATE orders
          SET status = 'refunded', refunded_at = now(), stripe_refund_id = $1
        WHERE stripe_payment_intent_id = $2 AND status = 'paid'
        RETURNING id
     )
     SELECT * FROM updated`,
    refundId,
    charge.payment_intent,
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
  await prisma.orders.updateMany({
    where: { id: orderId, status: 'pending' },
    data: { status: 'expired' },
  })
}

module.exports = {
  createCheckoutSession,
  verifyWebhookSignature,
  handleCheckoutCompleted,
  handleCheckoutExpired,
  handleChargeRefunded,
}
