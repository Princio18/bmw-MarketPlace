const { prisma, pgSafe } = require('../db')
const { resolveImage } = require('../utils/imageResolver')

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
         '/api/vehicles/' || id || '/image?v=' || COALESCE((EXTRACT(EPOCH FROM image_updated_at) * 1000)::bigint, 0) AS "image",
         NULLIF(model3d_exterior_filename, '') IS NOT NULL AS "has3dExterior",
         CASE WHEN NULLIF(model3d_exterior_filename, '') IS NOT NULL
              THEN '/models/exteriors/' || model3d_exterior_filename END AS "exteriorModelUrl",
         NULLIF(model3d_interior_filename, '') IS NOT NULL AS "has3dInterior",
         CASE WHEN NULLIF(model3d_interior_filename, '') IS NOT NULL
              THEN '/models/interiors/' || model3d_interior_filename END AS "interiorModelUrl",
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
         specs,
         '/api/vehicles/' || id || '/image?v=' || COALESCE((EXTRACT(EPOCH FROM image_updated_at) * 1000)::bigint, 0) AS "image",
         NULLIF(model3d_exterior_filename, '') IS NOT NULL AS "has3dExterior",
         CASE WHEN NULLIF(model3d_exterior_filename, '') IS NOT NULL
              THEN '/models/exteriors/' || model3d_exterior_filename END AS "exteriorModelUrl",
         NULLIF(model3d_interior_filename, '') IS NOT NULL AS "has3dInterior",
         CASE WHEN NULLIF(model3d_interior_filename, '') IS NOT NULL
              THEN '/models/interiors/' || model3d_interior_filename END AS "interiorModelUrl",
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
      select: {
        image_key: true,
        image_data: true,
        image_mime_type: true,
      },
    })
    if (!vehicle || (!vehicle.image_key && !vehicle.image_data)) {
      return res.redirect('/images/placeholder-vehicle.svg')
    }
    const image = await resolveImage({
      imageKey: vehicle.image_key,
      imageData: vehicle.image_data,
      imageMimeType: vehicle.image_mime_type,
      scope: 'vehicles',
      id: req.params.id,
    })
    if (!image) {
      return res.redirect('/images/placeholder-vehicle.svg')
    }
    res.set('Content-Type', image.contentType)
    res.set('Cache-Control', 'public, max-age=86400')
    // Trace la source réellement servie. resolveImage() bascule silencieusement
    // sur le BYTEA si le bucket est injoignable, et la réponse reste un 200
    // presque identique : sans cet en-tête, on confondrait un bucket en panne
    // avec un bucket qui fonctionne, précisément au moment du vidage BYTEA.
    res.set('X-Image-Source', image.source)
    res.send(image.buffer)
  } catch (err) {
    console.error('[vehicles] erreur GET /api/vehicles/:id/image :', err)
    res.status(500).json({ error: 'Unable to load vehicle image.' })
  }
}

module.exports = { getVehicles, getPriceRange, getVehicleById, getVehicleImage }
