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

// GET /api/orders/:id — commande d'un utilisateur, avec décompte détaillé
// (price_breakdown pour les commandes issues d'une offre, sinon lignes panier).
async function getMyOrder(req, res) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       o.id,
       o.amount::float8 AS "amount",
       o.currency,
       o.status,
       o.processing_status AS "processingStatus",
       o.created_at AS "createdAt",
       o.receipt_sent_at AS "receiptSentAt",
       o.offer_id AS "offerId",
       o.price_breakdown AS "priceBreakdown",
       v.model_name AS "modelName",
       v.variant_label AS "variantLabel",
       o.vehicle_id AS "vehicleId",
       '/api/vehicles/' || o.vehicle_id || '/image?v=' || COALESCE((EXTRACT(EPOCH FROM v.image_updated_at) * 1000)::bigint, 0) AS "image"
     FROM orders o
     JOIN vehicles v ON v.id = o.vehicle_id
     WHERE o.id = $1 AND o.user_id = $2`,
    req.params.id,
    req.user.id,
  )
  const order = pgSafe(rows)[0]
  if (!order) {
    return res.status(404).json({ error: 'Commande introuvable.' })
  }
  return res.json({ order })
}

const router = Router()

router.use(authenticate)

router.get('/mine', getMyOrders)
router.get('/:id', getMyOrder)

module.exports = router