const { Router } = require('express')
const { query } = require('../db')
const { authenticate } = require('../middleware/auth')

const CART_SELECT = `
  SELECT
    c.id,
    c.configuration_data AS "configurationData",
    c.is_validated AS "isValidated",
    v.id AS "vehicleId",
    v.model_name AS "modelName",
    '/api/vehicles/' || v.id || '/image' AS "image",
    v.base_price::float8 AS "basePrice"
  FROM carts c
  JOIN vehicles v ON v.id = c.vehicle_id
`

const ACTIVE_CART_CONDITION = `c.user_id = $1 AND c.is_validated = false AND c.deleted_at IS NULL`

async function getActiveCart(userId) {
  const { rows } = await query(
    `${CART_SELECT} WHERE ${ACTIVE_CART_CONDITION}
     ORDER BY c.updated_at DESC LIMIT 1`,
    [userId],
  )
  return rows[0] || null
}

async function findVehicleById(id) {
  const { rows } = await query(
    `SELECT id, base_price::float8 AS "basePrice" FROM vehicles WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  )
  return rows[0] || null
}

async function getCart(req, res) {
  const cart = await getActiveCart(req.user.id)
  return res.json({ cart })
}

async function upsertCart(req, res) {
  const { vehicleId, configurationData } = req.body || {}

  if (!vehicleId || !configurationData) {
    return res
      .status(400)
      .json({ error: 'vehicleId et configurationData sont obligatoires.' })
  }

  const vehicle = await findVehicleById(vehicleId)
  if (!vehicle) {
    return res.status(404).json({ error: 'Véhicule introuvable.' })
  }

  const existing = await getActiveCart(req.user.id)
  if (existing) {
    await query(
      `UPDATE carts
         SET vehicle_id = $1, configuration_data = $2, updated_at = now()
       WHERE id = $3`,
      [vehicleId, JSON.stringify(configurationData), existing.id],
    )
    const cart = await getActiveCart(req.user.id)
    return res.status(200).json({ cart })
  }

  await query(
    `INSERT INTO carts (user_id, vehicle_id, configuration_data)
     VALUES ($1, $2, $3)`,
    [req.user.id, vehicleId, JSON.stringify(configurationData)],
  )
  const cart = await getActiveCart(req.user.id)
  return res.status(201).json({ cart })
}

const router = Router()

router.use(authenticate)

router.get('/', getCart)
router.post('/', upsertCart)

module.exports = router