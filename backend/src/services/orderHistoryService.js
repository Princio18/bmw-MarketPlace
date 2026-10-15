const { prisma } = require('../db')

// Journalise UNE transition de statut de commande. `changedBy` reste NULL pour
// les transitions système (webhook Stripe). Toute transition passe par ici afin
// de garantir « exactement une ligne par changement ».
async function recordTransition({ orderId, toStatus, note = null, changedBy = null }) {
  await prisma.order_status_history.create({
    data: {
      order_id: orderId,
      to_status: toStatus,
      note: note || null,
      changed_by: changedBy || null,
    },
  })
}

// Idempotence : évite de dupliquer une ligne lors d'un rejeu de webhook.
async function hasTransition(orderId, toStatus) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM order_status_history WHERE order_id = $1 AND to_status = $2 LIMIT 1`,
    orderId,
    toStatus,
  )
  return rows.length > 0
}

async function recordTransitionOnce({ orderId, toStatus, note = null, changedBy = null }) {
  if (await hasTransition(orderId, toStatus)) return false
  await recordTransition({ orderId, toStatus, note, changedBy })
  return true
}

module.exports = { recordTransition, recordTransitionOnce, hasTransition }
