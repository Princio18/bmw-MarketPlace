const { stripe } = require('./stripeClient')
const { notify } = require('./adminNotifications')
const { prisma } = require('../db')
const { sendOrderReceipt } = require('./receiptService')
const { background } = require('../utils/background')
const accessoryService = require('./accessoryService')

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

// Marque l'offre liée comme acceptée et bascule la demande en 'converted'.
// UPDATE ... WHERE status='active' RETURNING : idempotent (un rejeu ne retourne
// aucune ligne et ne reconvertit donc pas la demande).
async function markOfferPaid(offerId, orderId) {
  const rows = await prisma.$queryRawUnsafe(
    `WITH updated AS (
       UPDATE offers
          SET status = 'accepted', accepted_at = now(), paid_order_id = $1, updated_at = now()
        WHERE id = $2 AND status = 'active'
        RETURNING request_id
     )
     SELECT * FROM updated`,
    orderId,
    offerId,
  )
  const row = rows[0]
  if (!row) return false
  await prisma.configuration_requests.updateMany({
    where: { id: row.request_id },
    data: { status: 'converted', updated_at: new Date() },
  })
  return true
}

// Décrémente le stock des accessoires d'une commande issue d'une offre. Les
// ids proviennent du décompte FIGÉ (price_breakdown), pas d'un panier.
async function decrementOfferStock(order) {
  const lines = order.price_breakdown?.lines
  if (!Array.isArray(lines)) return
  const accessoryIds = lines
    .filter((line) => line.kind === 'accessory' && line.refId)
    .map((line) => line.refId)

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
  if (order.offer_id) {
    await markOfferPaid(order.offer_id, order.id)
  }

  // Après le marquage « paid » : on décrémente le stock des accessoires.
  if (order.cart_id) {
    await decrementAccessoryStock(order)
  } else if (order.offer_id) {
    await decrementOfferStock(order)
  }

  notify({
    type: 'new_order',
    message: `Nouvelle commande payée (${order.amount} ${order.currency})`,
    relatedId: order.id,
  })

  // Reçu d'offre : envoyé de façon awaitée (décompte détaillé exigé). Reçu
  // panier : en tâche de fond, comportement historique.
  if (order.offer_id) {
    try {
      await sendOrderReceipt(order.id)
    } catch (err) {
      console.error('[webhook] échec envoi reçu offre :', err.message)
    }
  } else {
    background(sendOrderReceipt(order.id))
  }
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
  verifyWebhookSignature,
  handleCheckoutCompleted,
  handleCheckoutExpired,
  handleChargeRefunded,
}
