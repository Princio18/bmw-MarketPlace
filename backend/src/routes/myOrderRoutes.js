const { Router } = require('express')
const { prisma, pgSafe } = require('../db')
const { authenticate } = require('../middleware/auth')
const { ROLES } = require('../roles')
const { generateReceiptPdfForOrder } = require('../services/receiptService')

// Libellés client des étapes de suivi. La frise consomme `history` et lit le
// `status` (traduit côté front) ; `label` est un repli lisible.
const STATUS_LABELS = {
  paid: 'Paid',
  pending: 'In preparation',
  ready: 'Ready for handover',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

// Statuts pour lesquels le VIN devient visible du client.
const VIN_VISIBLE_STATUSES = new Set(['ready', 'delivered'])

async function getMyOrders(req, res) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       o.id,
       o.amount::float8 AS "amount",
       o.currency,
       o.status,
       o.processing_status AS "processingStatus",
       o.created_at AS "createdAt",
       v.model_name AS "modelName",
       v.variant_label AS "variantLabel",
       o.vehicle_id AS "vehicleId",
       o.offer_id AS "offerId",
       '/api/vehicles/' || o.vehicle_id || '/image?v=' || COALESCE((EXTRACT(EPOCH FROM v.image_updated_at) * 1000)::bigint, 0) AS "image",
       EXISTS(
         SELECT 1 FROM reviews r
          WHERE r.order_id = o.id AND r.deleted_at IS NULL
       ) AS "hasReview"
     FROM orders o
     JOIN vehicles v ON v.id = o.vehicle_id
     WHERE o.user_id = $1
     ORDER BY o.created_at DESC`,
    req.user.id,
  )
  res.json({ orders: pgSafe(rows) })
}

// GET /api/orders/:id — commande d'un utilisateur : décompte, suivi, remise et
// historique. Le VIN n'est renvoyé qu'à partir de l'étape 'ready'.
async function getMyOrder(req, res) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       o.id,
       o.amount::float8 AS "amount",
       o.currency,
       o.status,
       o.processing_status AS "processingStatus",
       o.vin,
       o.scheduled_handover_at AS "scheduledHandoverAt",
       o.created_at AS "createdAt",
       o.receipt_sent_at AS "receiptSentAt",
       o.offer_id AS "offerId",
       o.price_breakdown AS "priceBreakdown",
       v.model_name AS "modelName",
       v.variant_label AS "variantLabel",
       o.vehicle_id AS "vehicleId",
       d.name AS "dealerName",
       d.city AS "dealerCity",
       d.latitude::float8 AS "dealerLatitude",
       d.longitude::float8 AS "dealerLongitude",
       '/api/vehicles/' || o.vehicle_id || '/image?v=' || COALESCE((EXTRACT(EPOCH FROM v.image_updated_at) * 1000)::bigint, 0) AS "image",
       EXISTS(
         SELECT 1 FROM reviews r
          WHERE r.order_id = o.id AND r.deleted_at IS NULL
       ) AS "hasReview"
     FROM orders o
     JOIN vehicles v ON v.id = o.vehicle_id
     LEFT JOIN dealers d ON d.id = o.handover_dealer_id
     WHERE o.id = $1 AND o.user_id = $2`,
    req.params.id,
    req.user.id,
  )
  const order = pgSafe(rows)[0]
  if (!order) {
    return res.status(404).json({ error: 'Commande introuvable.' })
  }

  const vinVisible = VIN_VISIBLE_STATUSES.has(order.processingStatus)
  const handover = {
    dealerName: order.dealerName || null,
    dealerCity: order.dealerCity || null,
    dealerLatitude: order.dealerLatitude ?? null,
    dealerLongitude: order.dealerLongitude ?? null,
    scheduledAt: order.scheduledHandoverAt || null,
    vin: vinVisible ? order.vin || null : null,
  }

  const historyRows = await prisma.$queryRawUnsafe(
    `SELECT h.to_status AS "status", h.created_at AS "at"
       FROM order_status_history h
      WHERE h.order_id = $1
      ORDER BY h.created_at ASC`,
    order.id,
  )
  const history = pgSafe(historyRows).map((row) => ({
    status: row.status,
    label: STATUS_LABELS[row.status] || row.status,
    at: row.at,
  }))

  return res.json({ order: { ...order, vin: vinVisible ? order.vin : null, handover, history } })
}

// GET /api/orders/:id/receipt — PDF régénéré à la volée. Propriétaire OU admin.
async function downloadReceipt(req, res) {
  const order = await prisma.orders.findFirst({
    where: { id: req.params.id },
    select: { id: true, user_id: true, status: true },
  })
  if (!order) {
    return res.status(404).json({ error: 'Commande introuvable.' })
  }
  const isOwner = order.user_id === req.user.id
  const isAdmin = req.user.role === ROLES.ADMIN
  if (!isOwner && !isAdmin) {
    return res.status(404).json({ error: 'Commande introuvable.' })
  }
  if (!isOwner && order.status !== 'paid' && order.status !== 'refunded') {
    return res.status(409).json({ error: 'Le reçu n\'est disponible qu\'après paiement.' })
  }

  try {
    const pdf = await generateReceiptPdfForOrder(order.id)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="receipt-${order.id.slice(0, 8)}.pdf"`,
    )
    return res.send(pdf)
  } catch (err) {
    console.error('[orders] génération reçu échouée', order.id, ':', err.message)
    return res.status(502).json({ error: 'Impossible de générer le reçu.' })
  }
}

const router = Router()

router.use(authenticate)

router.get('/mine', getMyOrders)
router.get('/:id', getMyOrder)
router.get('/:id/receipt', downloadReceipt)

module.exports = router
