const { Router } = require('express')
const { query } = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { checkPermission } = require('../middleware/checkPermission')
const { ROLES } = require('../roles')
const { sendOrderReceipt } = require('../services/receiptService')
const { getStripe } = require('../services/stripeClient')

const PROCESSING_STATUSES = ['pending', 'ready', 'delivered', 'cancelled']

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

  const { rows } = await query(
    `${ORDER_SELECT}
     ORDER BY o.created_at DESC
     LIMIT $1 OFFSET $2`,
    [pageSize, offset],
  )
  return res.json({ orders: rows, page, pageSize })
}

async function getSummary(req, res) {
  const { rows } = await query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::float8 AS "totalRevenue",
       COUNT(*) FILTER (WHERE status = 'paid') AS "ordersThisMonth",
       COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND created_at >= date_trunc('month', now())), 0)::float8 AS "revenueThisMonth"
     FROM orders`,
  )
  return res.json(rows[0])
}

async function resendReceipt(req, res) {
  const { rowCount } = await query(
    `SELECT 1 FROM orders WHERE id = $1 AND status = 'paid'`,
    [req.params.id],
  )
  if (rowCount === 0) {
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
  const { processingStatus } = req.body || {}
  if (!PROCESSING_STATUSES.includes(processingStatus)) {
    return res
      .status(400)
      .json({ error: `processingStatus doit être l'un de : ${PROCESSING_STATUSES.join(', ')}.` })
  }

  const { rowCount } = await query(
    'UPDATE orders SET processing_status = $1 WHERE id = $2',
    [processingStatus, req.params.id],
  )
  if (rowCount === 0) {
    return res.status(404).json({ error: 'Commande introuvable.' })
  }
  return res.json({ ok: true, processingStatus })
}

async function refundOrder(req, res) {
  const stripe = getStripe()
  if (!stripe) {
    return res
      .status(500)
      .json({ error: 'Le paiement n’est pas configuré (STRIPE_SECRET_KEY manquant).' })
  }

  const { rows } = await query(
    'SELECT id, status, stripe_payment_intent_id, amount, currency FROM orders WHERE id = $1',
    [req.params.id],
  )
  const order = rows[0]
  if (!order) {
    return res.status(404).json({ error: 'Commande introuvable.' })
  }

  if (order.status !== 'paid') {
    return res.status(400).json({ error: 'Only paid orders can be refunded.' })
  }

  // Le statut de la commande n'est PAS modifié ici : c'est le webhook
  // `charge.refunded` qui fait foi, exactement comme pour le paiement initial.
  await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })

  return res.json({ refundInitiated: true })
}

const router = Router()

router.use(authenticate)
router.use(requireRole(ROLES.ADMIN))

router.get('/', listOrders)
router.get('/summary', getSummary)
router.post('/:id/resend-receipt', resendReceipt)
router.put('/:id/status', checkPermission('can_manage_orders'), setProcessingStatus)
router.post('/:id/refund', checkPermission('can_process_refunds'), refundOrder)

module.exports = router