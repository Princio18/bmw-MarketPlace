const { prisma, pgSafe } = require('../db')
const { notify } = require('../services/adminNotifications')

async function createReview(req, res) {
  const { vehicleId, orderId, rating, comment } = req.body || {}

  if (!vehicleId || !orderId) {
    return res.status(400).json({ error: 'vehicleId et orderId sont obligatoires.' })
  }
  const parsedRating = Number(rating)
  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({ error: 'rating doit être un entier entre 1 et 5.' })
  }
  if (comment !== undefined && (typeof comment !== 'string' || comment.length > 2000)) {
    return res.status(400).json({ error: 'commentaire invalide (max 2000 caractères).' })
  }

  const order = await prisma.orders.findFirst({
    where: { id: orderId },
    select: { id: true, user_id: true, vehicle_id: true, status: true },
  })

  if (!order || order.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You cannot review this order.' })
  }
  if (order.vehicle_id !== vehicleId || order.status !== 'paid') {
    return res.status(403).json({ error: 'You cannot review this order.' })
  }

  try {
    await prisma.reviews.create({
      data: {
        user_id: req.user.id,
        vehicle_id: vehicleId,
        order_id: orderId,
        rating: parsedRating,
        comment: comment ?? null,
        status: 'pending',
      },
    })
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'You already reviewed this order.' })
    }
    throw err
  }

  notify({
    type: 'new_review',
    message: 'Nouvel avis client en attente de modération',
    relatedId: orderId,
  })

  return res.status(201).json({ ok: true, status: 'pending' })
}

async function getVehicleReviews(req, res) {
  const vehicleId = req.params.id
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10))
  const offset = (page - 1) * pageSize

  const rows = await prisma.reviews.findMany({
    where: { vehicle_id: vehicleId, status: 'published', deleted_at: null },
    orderBy: { created_at: 'desc' },
    skip: offset,
    take: pageSize,
    select: { rating: true, comment: true, created_at: true },
  })
  const reviews = rows.map((r) => ({
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  }))
  res.json({ reviews, page, pageSize })
}

async function getReviewSummary(req, res) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       COALESCE(ROUND(AVG(rating::numeric), 1), 0)::float8 AS "averageRating",
       COUNT(*)::int AS "totalReviews"
       FROM reviews
      WHERE vehicle_id = $1 AND status = 'published' AND deleted_at IS NULL`,
    req.params.id,
  )
  res.json(pgSafe(rows[0]))
}

async function listAdminReviews(req, res) {
  const { status } = req.query
  const conditions = ['r.deleted_at IS NULL']
  const values = []

  if (status) {
    values.push(status)
    conditions.push(`r.status = $${values.length}`)
  }

  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       r.id,
       r.order_id AS "orderId",
       r.rating,
       r.comment,
       r.status,
       r.created_at AS "createdAt",
       u.email AS "buyerEmail",
       v.model_name AS "modelName",
       v.variant_label AS "variantLabel"
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     JOIN vehicles v ON v.id = r.vehicle_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY r.created_at DESC`,
    ...values,
  )
  res.json({ reviews: pgSafe(rows) })
}

async function setReviewStatus(req, res) {
  const allowed = ['published', 'rejected']
  const { status } = req.body || {}
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status doit être l'un de : ${allowed.join(', ')}.` })
  }

  const result = await prisma.reviews.updateMany({
    where: { id: req.params.id, deleted_at: null },
    data: { status },
  })
  if (result.count === 0) {
    return res.status(404).json({ error: 'Avis introuvable.' })
  }
  return res.json({ ok: true, status })
}

async function deleteReview(req, res) {
  const result = await prisma.reviews.updateMany({
    where: { id: req.params.id, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  if (result.count === 0) {
    return res.status(404).json({ error: 'Avis introuvable.' })
  }
  return res.json({ ok: true })
}

module.exports = {
  createReview,
  getVehicleReviews,
  getReviewSummary,
  listAdminReviews,
  setReviewStatus,
  deleteReview,
}
