const { prisma, pgSafe } = require('../db')

async function getVehicles(req, res) {
  try {
    const { category, series, drivetrain, mPerformance, priceFrom, priceTo, sort } = req.query
    const conditions = ['deleted_at IS NULL']
    const values = []

    if (drivetrain) {
      values.push(drivetrain.split(','))
      conditions.push(`drivetrain = ANY($${values.length})`)
    }
    if (mPerformance === 'true') {
      conditions.push('is_m_performance = true')
    }
    if (priceFrom) {
      values.push(Number(priceFrom))
      conditions.push(`(base_price IS NULL OR base_price >= $${values.length})`)
    }
    if (priceTo) {
      values.push(Number(priceTo))
      conditions.push(`(base_price IS NULL OR base_price <= $${values.length})`)
    }
    if (category) {
      values.push(category.split(','))
      conditions.push(`category = ANY($${values.length})`)
    }
    if (series) {
      values.push(series.split(','))
      conditions.push(`series = ANY($${values.length})`)
    }

    const orderMap = {
      new_arrival: 'is_new DESC, created_at DESC',
      price_low_to_high: 'base_price ASC NULLS LAST',
      price_high_to_low: 'base_price DESC NULLS LAST',
    }
    const orderClause = orderMap[sort] || 'created_at ASC'

    // Requête complexe (agrégats + filtres dynamiques) : conservée en SQL
    // brut exécuté par Prisma pour préserver le format exact des réponses.
    const rows = await prisma.$queryRawUnsafe(
      `SELECT
         id,
         model_name AS "modelName",
         category,
         series,
         variant_label AS "variantLabel",
         is_new AS "isNew",
         drivetrain,
         is_m_performance AS "isMPerformance",
         base_price::float8 AS "basePrice",
         '/api/vehicles/' || id || '/image' AS "image",
         (SELECT ROUND(AVG(rating::numeric), 1)
            FROM reviews r
           WHERE r.vehicle_id = vehicles.id
             AND r.status = 'published' AND r.deleted_at IS NULL)::float8 AS "averageRating",
         (SELECT COUNT(*)
            FROM reviews r
           WHERE r.vehicle_id = vehicles.id
             AND r.status = 'published' AND r.deleted_at IS NULL) AS "reviewCount"
       FROM vehicles
       WHERE ${conditions.join(' AND ')}
       ORDER BY ${orderClause}`,
      ...values,
    )
    res.json(pgSafe(rows))
  } catch (err) {
    console.error('[vehicles] erreur GET /api/vehicles :', err)
    res.status(500).json({ error: 'Unable to load vehicles.' })
  }
}

async function getPriceRange(req, res) {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT
         MIN(base_price)::float8 AS "min",
         MAX(base_price)::float8 AS "max"
       FROM vehicles
       WHERE deleted_at IS NULL AND base_price IS NOT NULL`,
    )
    res.json(pgSafe(rows[0]))
  } catch (err) {
    console.error('[vehicles] erreur GET /api/vehicles/price-range :', err)
    res.status(500).json({ error: 'Unable to load price range.' })
  }
}

async function getVehicleById(req, res) {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT
         id,
         model_name AS "modelName",
         category,
         series,
         variant_label AS "variantLabel",
         is_new AS "isNew",
         drivetrain,
         is_m_performance AS "isMPerformance",
         base_price::float8 AS "basePrice",
         '/api/vehicles/' || id || '/image' AS "image",
         (SELECT ROUND(AVG(rating::numeric), 1)
            FROM reviews r
           WHERE r.vehicle_id = vehicles.id
             AND r.status = 'published' AND r.deleted_at IS NULL)::float8 AS "averageRating",
         (SELECT COUNT(*)
            FROM reviews r
           WHERE r.vehicle_id = vehicles.id
             AND r.status = 'published' AND r.deleted_at IS NULL) AS "reviewCount"
       FROM vehicles
       WHERE id = $1 AND deleted_at IS NULL`,
      req.params.id,
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found.' })
    }
    res.json(pgSafe(rows[0]))
  } catch (err) {
    console.error('[vehicles] erreur GET /api/vehicles/:id :', err)
    res.status(500).json({ error: 'Unable to load vehicle.' })
  }
}

async function getVehicleImage(req, res) {
  try {
    const vehicle = await prisma.vehicles.findFirst({
      where: { id: req.params.id },
      select: { image_data: true, image_mime_type: true },
    })
    if (!vehicle || !vehicle.image_data) {
      return res.redirect('/images/placeholder-vehicle.svg')
    }
    res.set('Content-Type', vehicle.image_mime_type)
    res.set('Cache-Control', 'public, max-age=86400')
    res.send(vehicle.image_data)
  } catch (err) {
    console.error('[vehicles] erreur GET /api/vehicles/:id/image :', err)
    res.status(500).json({ error: 'Unable to load vehicle image.' })
  }
}

module.exports = { getVehicles, getPriceRange, getVehicleById, getVehicleImage }
