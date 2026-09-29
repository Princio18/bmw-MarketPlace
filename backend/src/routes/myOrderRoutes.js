const { Router } = require('express')
const { prisma, pgSafe } = require('../db')
const { authenticate } = require('../middleware/auth')

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
       '/api/vehicles/' || o.vehicle_id || '/image' AS "image",
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

const router = Router()

router.use(authenticate)

router.get('/mine', getMyOrders)

module.exports = router