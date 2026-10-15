const { Router } = require('express')
const { prisma, pgSafe } = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { checkPermission } = require('../middleware/checkPermission')
const { ROLES } = require('../roles')
const { sendOrderReceipt } = require('../services/receiptService')
const { getStripe } = require('../services/stripeClient')
const { recordTransition } = require('../services/orderHistoryService')
const { sendOrderStatusEmail } = require('../services/orderStatusEmail')
const { logAudit } = require('../services/auditLog')
const { background } = require('../utils/background')

const PROCESSING_STATUSES = ['pending', 'ready', 'delivered', 'cancelled']

// Graphe des transitions autorisées. Un saut d'étape ou un retour arrière
// n'apparaît pas ici et sera donc refusé (400). 'delivered' et 'cancelled'
// sont terminaux.
const ALLOWED_TRANSITIONS = {
  pending: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/

const ORDER_SELECT = `
  SELECT
    o.id,
    o.amount::float8 AS "amount",
    o.currency,
    o.status,
    o.processing_status AS "processingStatus",
    o.refunded_at AS "refundedAt",
    o.created_at AS "createdAt",
    o.receipt_sent_at AS "receiptSentAt",
    u.email AS "buyerEmail",
    v.model_name AS "modelName",
    v.variant_label AS "variantLabel"
  FROM orders o
  JOIN users u ON u.id = o.user_id
  JOIN vehicles v ON v.id = o.vehicle_id
`

async function listOrders(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
  const offset = (page - 1) * pageSize

  const rows = await prisma.$queryRawUnsafe(
    `${ORDER_SELECT}
     ORDER BY o.created_at DESC
     LIMIT $1 OFFSET $2`,
    pageSize,
    offset,
  )
  return res.json({ orders: pgSafe(rows), page, pageSize })
}

async function getSummary(req, res) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::float8 AS "totalRevenue",
       COUNT(*) FILTER (WHERE status = 'paid') AS "ordersThisMonth",
       COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND created_at >= date_trunc('month', now())), 0)::float8 AS "revenueThisMonth"
     FROM orders`,
  )
  return res.json(pgSafe(rows[0]))
}

async function resendReceipt(req, res) {
  const order = await prisma.orders.findFirst({
    where: { id: req.params.id, status: 'paid' },
    select: { id: true },
  })
  if (!order) {
    return res.status(404).json({ error: 'Commande introuvable ou non payée.' })
  }

  try {
    await sendOrderReceipt(req.params.id)
    return res.json({ ok: true })
  } catch (err) {
    console.error('[admin] resend-receipt échec pour', req.params.id, ':', err.message)
    return res.status(502).json({ error: 'Impossible de renvoyer le reçu.' })
  }
}

async function setProcessingStatus(req, res) {
  const { processingStatus, scheduledHandoverAt, vin, note } = req.body || {}
  if (!PROCESSING_STATUSES.includes(processingStatus)) {
    return res
      .status(400)
      .json({ error: `processingStatus doit être l'un de : ${PROCESSING_STATUSES.join(', ')}.` })
  }

  const order = await prisma.orders.findFirst({
    where: { id: req.params.id },
    select: { id: true, status: true, processing_status: true },
  })
  if (!order) {
    return res.status(404).json({ error: 'Commande introuvable.' })
  }
  if (order.status !== 'paid') {
    return res.status(409).json({ error: 'Only paid orders can be updated.' })
  }

  const from = order.processing_status || 'pending'
  const allowed = ALLOWED_TRANSITIONS[from] || []
  if (processingStatus === from) {
    return res.status(400).json({ error: `Order is already '${from}'.` })
  }
  if (!allowed.includes(processingStatus)) {
    return res
      .status(400)
      .json({ error: `Transition '${from}' → '${processingStatus}' is not allowed.` })
  }

  const data = { processing_status: processingStatus }

  if (processingStatus === 'ready') {
    const normalizedVin = String(vin || '').trim().toUpperCase()
    if (!VIN_REGEX.test(normalizedVin)) {
      return res
        .status(400)
        .json({ error: 'A valid 17-character VIN is required (letters I, O, Q excluded).' })
    }
    const scheduled = scheduledHandoverAt ? new Date(scheduledHandoverAt) : null
    if (!scheduled || Number.isNaN(scheduled.getTime())) {
      return res.status(400).json({ error: 'A valid handover date and time is required.' })
    }
    if (scheduled.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'The handover date must be in the future.' })
    }
    data.vin = normalizedVin
    data.scheduled_handover_at = scheduled
  }

  // Transaction : la transition de statut et sa ligne d'historique sont
  // indissociables (exactement une ligne par changement).
  await prisma.$transaction(async (tx) => {
    await tx.orders.update({ where: { id: order.id }, data })
    await tx.order_status_history.create({
      data: {
        order_id: order.id,
        to_status: processingStatus,
        note: note ? String(note).slice(0, 500) : null,
        changed_by: req.user.id,
      },
    })
  })

  // Email client en tâche de fond : un échec SMTP ne doit pas annuler la
  // transition déjà persistée.
  background(
    sendOrderStatusEmail(order.id).catch((err) => {
      console.error('[admin] échec email statut commande', order.id, ':', err.message)
    }),
  )

  logAudit(req, 'order.status', 'order', order.id, {
    from,
    to: processingStatus,
    vin: data.vin ?? null,
  })

  return res.json({ ok: true, processingStatus })
}

// GET /api/admin/orders/:id — détail complet + historique pour le panneau admin.
async function getOrderDetail(req, res) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       o.id,
       o.amount::float8 AS "amount",
       o.currency,
       o.status,
       o.processing_status AS "processingStatus",
       o.vin,
       o.scheduled_handover_at AS "scheduledHandoverAt",
       o.refunded_at AS "refundedAt",
       o.created_at AS "createdAt",
       o.receipt_sent_at AS "receiptSentAt",
       o.offer_id AS "offerId",
       o.price_breakdown AS "priceBreakdown",
       u.email AS "buyerEmail",
       v.model_name AS "modelName",
       v.variant_label AS "variantLabel",
       d.name AS "dealerName",
       d.city AS "dealerCity"
     FROM orders o
     JOIN users u ON u.id = o.user_id
     JOIN vehicles v ON v.id = o.vehicle_id
     LEFT JOIN dealers d ON d.id = o.handover_dealer_id
     WHERE o.id = $1`,
    req.params.id,
  )
  const order = pgSafe(rows)[0]
  if (!order) {
    return res.status(404).json({ error: 'Commande introuvable.' })
  }

  const history = await prisma.$queryRawUnsafe(
    `SELECT
       h.to_status AS "status",
       h.note,
       h.created_at AS "at",
       u.email AS "changedByEmail"
     FROM order_status_history h
     LEFT JOIN users u ON u.id = h.changed_by
     WHERE h.order_id = $1
     ORDER BY h.created_at ASC`,
    order.id,
  )

  return res.json({ order, history: pgSafe(history) })
}

async function refundOrder(req, res) {
  const stripe = getStripe()
  if (!stripe) {
    return res
      .status(500)
      .json({ error: 'Le paiement n’est pas configuré (STRIPE_SECRET_KEY manquant).' })
  }

  const order = await prisma.orders.findFirst({
    where: { id: req.params.id },
    select: { id: true, status: true, stripe_payment_intent_id: true },
  })
  if (!order) {
    return res.status(404).json({ error: 'Commande introuvable.' })
  }

  if (order.status !== 'paid') {
    return res.status(400).json({ error: 'Only paid orders can be refunded.' })
  }

  // Le statut de la commande n'est PAS modifié ici : c'est le webhook
  // `charge.refunded` qui fait foi, exactement comme pour le paiement initial.
  await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })

  logAudit(req, 'order.refund', 'order', order.id, {
    paymentIntentId: order.stripe_payment_intent_id,
  })

  return res.json({ refundInitiated: true })
}

const router = Router()

router.use(authenticate)
router.use(requireRole(ROLES.ADMIN))

router.get('/', listOrders)
router.get('/summary', getSummary)
router.get('/:id', getOrderDetail)
router.post('/:id/resend-receipt', resendReceipt)
router.put('/:id/status', checkPermission('can_manage_orders'), setProcessingStatus)
router.post('/:id/refund', checkPermission('can_process_refunds'), refundOrder)

module.exports = router