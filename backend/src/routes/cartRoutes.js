const { Router } = require('express')
const { prisma, pgSafe } = require('../db')
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
  const rows = await prisma.$queryRawUnsafe(
    `${CART_SELECT} WHERE ${ACTIVE_CART_CONDITION}
     ORDER BY c.updated_at DESC LIMIT 1`,
    userId,
  )
  return rows.length ? pgSafe(rows[0]) : null
}

async function findVehicleById(id) {
  const vehicle = await prisma.vehicles.findFirst({
    where: { id, deleted_at: null },
    select: { id: true, base_price: true },
  })
  if (!vehicle) return null
  return { id: vehicle.id, basePrice: vehicle.base_price == null ? null : Number(vehicle.base_price) }
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
    await prisma.carts.update({
      where: { id: existing.id },
      data: {
        vehicle_id: vehicleId,
        configuration_data: configurationData,
        updated_at: new Date(),
      },
    })
    const cart = await getActiveCart(req.user.id)
    return res.status(200).json({ cart })
  }

  await prisma.carts.create({
    data: {
      user_id: req.user.id,
      vehicle_id: vehicleId,
      configuration_data: configurationData,
    },
  })
  const cart = await getActiveCart(req.user.id)
  return res.status(201).json({ cart })
}

const router = Router()

router.use(authenticate)

router.get('/', getCart)
router.post('/', upsertCart)

module.exports = router
