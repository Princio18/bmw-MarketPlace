const { Router } = require('express')
const { query } = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { checkPermission } = require('../middleware/checkPermission')
const { ROLES } = require('../roles')

const CLIENT_ROLE = "(SELECT id FROM roles WHERE name = 'client')"

async function listClients(req, res) {
  const { rows } = await query(
    `SELECT
       u.id,
       u.email,
       u.created_at AS "createdAt",
       u.is_active AS "isActive",
       COUNT(o.id) FILTER (WHERE o.status = 'paid') AS "orderCount",
       COALESCE(SUM(o.amount) FILTER (WHERE o.status = 'paid'), 0)::float8 AS "totalSpent"
     FROM users u
     LEFT JOIN orders o ON o.user_id = u.id
     WHERE u.role_id = ${CLIENT_ROLE} AND u.deleted_at IS NULL
     GROUP BY u.id
     ORDER BY u.created_at DESC`,
  )
  res.json({ clients: rows })
}

async function getClient(req, res) {
  const clientId = req.params.id

  const [profile, orders, cart, favorites] = await Promise.all([
    query(
      `SELECT id, email, first_name AS "firstName", last_name AS "lastName",
              is_active AS "isActive", created_at AS "createdAt"
         FROM users
        WHERE id = $1 AND role_id = ${CLIENT_ROLE} AND deleted_at IS NULL`,
      [clientId],
    ),
    query(
      `SELECT o.id, o.amount::float8 AS "amount", o.currency, o.status,
              o.processing_status AS "processingStatus", o.created_at AS "createdAt",
              v.model_name AS "modelName", v.variant_label AS "variantLabel",
              EXISTS(SELECT 1 FROM reviews r WHERE r.order_id = o.id AND r.deleted_at IS NULL)
                AS "hasReview"
         FROM orders o
         JOIN vehicles v ON v.id = o.vehicle_id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC`,
      [clientId],
    ),
    query(
      `SELECT c.id, c.configuration_data AS "configurationData", c.updated_at AS "updatedAt",
              v.model_name AS "modelName", v.base_price::float8 AS "basePrice",
              '/api/vehicles/' || v.id || '/image' AS "image"
         FROM carts c
         JOIN vehicles v ON v.id = c.vehicle_id
        WHERE c.user_id = $1 AND c.is_validated = false AND c.deleted_at IS NULL
        ORDER BY c.updated_at DESC LIMIT 1`,
      [clientId],
    ),
    query(
      `SELECT v.id, v.model_name AS "modelName", v.variant_label AS "variantLabel",
              v.base_price::float8 AS "basePrice",
              '/api/vehicles/' || v.id || '/image' AS "image"
         FROM favorites f
         JOIN vehicles v ON v.id = f.vehicle_id AND v.deleted_at IS NULL
        WHERE f.user_id = $1`,
      [clientId],
    ),
  ])

  if (profile.rows.length === 0) {
    return res.status(404).json({ error: 'Client introuvable.' })
  }

  res.json({
    client: profile.rows[0],
    orders: orders.rows,
    cart: cart.rows[0] || null,
    favorites: favorites.rows,
  })
}

const router = Router()

router.use(authenticate)
router.use(requireRole(ROLES.ADMIN))

router.get('/', checkPermission('can_manage_clients'), listClients)
router.get('/:id', checkPermission('can_manage_clients'), getClient)

module.exports = router