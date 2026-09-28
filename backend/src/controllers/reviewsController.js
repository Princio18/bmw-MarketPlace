const { query } = require('../db')
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

  const order = (
    await query(
      `SELECT id, user_id, vehicle_id, status
         FROM orders
        WHERE id = $1`,
      [orderId],
    )
  ).rows[0]

  if (!order || order.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You cannot review this order.' })
  }
  if (order.vehicle_id !== vehicleId || order.status !== 'paid') {
    return res.status(403).json({ error: 'You cannot review this order.' })
  }

  try {
    await query(
      `INSERT INTO reviews (user_id, vehicle_id, order_id, rating, comment, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [req.user.id, vehicleId, orderId, parsedRating, comment ?? null],
    )
  } catch (err) {
    if (err.code === '23505') {
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

  const { rows } = await query(
    `SELECT rating, comment, created_at AS "createdAt"
       FROM reviews
      WHERE vehicle_id = $1 AND status = 'published' AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`,
    [vehicleId, pageSize, offset],
  )
  res.json({ reviews: rows, page, pageSize })
}

async function getReviewSummary(req, res) {
  const { rows } = await query(
    `SELECT
       COALESCE(ROUND(AVG(rating::numeric), 1), 0)::float8 AS "averageRating",
       COUNT(*)::int AS "totalReviews"
       FROM reviews
      WHERE vehicle_id = $1 AND status = 'published' AND deleted_at IS NULL`,
    [req.params.id],
  )
  res.json(rows[0])
}

async function listAdminReviews(req, res) {
  const { status } = req.query
  const conditions = ['r.deleted_at IS NULL']
  const values = []

  if (status) {
    values.push(status)
    conditions.push(`r.status = $${values.length}`)
  }

  const { rows } = await query(
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
    values,
  )
  res.json({ reviews: rows })
}

async function setReviewStatus(req, res) {
  const allowed = ['published', 'rejected']
  const { status } = req.body || {}
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status doit être l'un de : ${allowed.join(', ')}.` })
  }

  const { rowCount } = await query(
    'UPDATE reviews SET status = $1 WHERE id = $2 AND deleted_at IS NULL',
    [status, req.params.id],
  )
  if (rowCount === 0) {
    return res.status(404).json({ error: 'Avis introuvable.' })
  }
  return res.json({ ok: true, status })
}

async function deleteReview(req, res) {
  const { rowCount } = await query(
    `UPDATE reviews SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`,
    [req.params.id],
  )
  if (rowCount === 0) {
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