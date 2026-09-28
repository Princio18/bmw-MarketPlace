const { Router } = require('express')
const { query } = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { checkPermission } = require('../middleware/checkPermission')
const upload = require('../middleware/upload')
const { ROLES } = require('../roles')

const DRIVETRAINS = ['electric', 'hybrid', 'petrol', 'diesel', 'concept', 'protection']
const DEFAULT_VARIANT = 'Models'

const VEHICLE_SELECT = `
  SELECT
    v.id,
    v.model_name AS "modelName",
    v.category,
    v.series,
    v.variant_label AS "variantLabel",
    v.is_new AS "isNew",
    v.drivetrain,
    v.is_m_performance AS "isMPerformance",
    v.base_price::float8 AS "basePrice",
    '/api/vehicles/' || v.id || '/image' AS "image",
    (SELECT COUNT(*) FROM favorites f WHERE f.vehicle_id = v.id)::int AS "favoritesCount",
    (SELECT COUNT(*) FROM carts c
       WHERE c.vehicle_id = v.id AND c.is_validated = false AND c.deleted_at IS NULL)::int
      AS "activeCartsCount",
    v.created_by AS "createdBy",
    a.first_name || ' ' || a.last_name AS "createdByName",
    a.email AS "createdByEmail",
    v.created_at AS "createdAt",
    v.updated_at AS "updatedAt",
    v.deleted_at AS "deletedAt"
  FROM vehicles v
  LEFT JOIN users a ON a.id = v.created_by
`

function toBool(value) {
  return value === true || value === 'true' || value === '1'
}

function coerceBody(body) {
  const source = body || {}
  return {
    modelName: source.modelName,
    category: source.category,
    series: source.series,
    variantLabel: source.variantLabel,
    drivetrain: source.drivetrain,
    isNew: toBool(source.isNew),
    isMPerformance: toBool(source.isMPerformance),
    basePrice: source.basePrice,
  }
}

function parseBasePrice(value) {
  if (value === undefined || value === null || value === '') {
    return { value: null }
  }
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) {
    return { error: 'Prix invalide : nombre positif attendu.' }
  }
  return { value: n }
}

function validateVehicleFields(body, { partial = false } = {}) {
  const errors = []

  const { modelName, category, series, variantLabel, drivetrain, isNew, isMPerformance, basePrice } =
    body || {}

  if (!partial || modelName !== undefined) {
    if (typeof modelName !== 'string' || !modelName.trim()) {
      errors.push('modelName est obligatoire.')
    }
  }
  if (!partial || category !== undefined) {
    if (typeof category !== 'string' || !category.trim()) {
      errors.push('category est obligatoire.')
    }
  }
  if (!partial || series !== undefined) {
    if (typeof series !== 'string' || !series.trim()) {
      errors.push('series est obligatoire.')
    }
  }
  if (!partial || drivetrain !== undefined) {
    if (!DRIVETRAINS.includes(drivetrain)) {
      errors.push(
        `drivetrain doit être l'un de : ${DRIVETRAINS.join(', ')}.`,
      )
    }
  }

  const price = parseBasePrice(basePrice)
  if (price.error) errors.push(price.error)

  return { errors, price }
}

function buildUpdate(body) {
  const fields = []
  const values = []

  const setMap = {
    modelName: 'model_name',
    category: 'category',
    series: 'series',
    variantLabel: 'variant_label',
    drivetrain: 'drivetrain',
    isNew: 'is_new',
    isMPerformance: 'is_m_performance',
    basePrice: 'base_price',
  }

  for (const [key, column] of Object.entries(setMap)) {
    if (body[key] === undefined) continue
    fields.push(`${column} = $${fields.length + 1}`)
    values.push(body[key])
  }

  return { fields, values }
}

async function findVehicleById(id) {
  const { rows } = await query(`${VEHICLE_SELECT} WHERE v.id = $1`, [id])
  return rows[0] || null
}

async function listVehicles(req, res) {
  const { rows } = await query(`${VEHICLE_SELECT} ORDER BY v.created_at DESC`)
  res.json(rows)
}

async function createVehicle(req, res) {
  const body = coerceBody(req.body)
  const { modelName = '', category = '', series = '', variantLabel, drivetrain, isNew, isMPerformance, basePrice } =
    body

  const { errors, price } = validateVehicleFields(body)
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') })
  }

  const { rows } = await query(
    `INSERT INTO vehicles
       (model_name, category, series, variant_label, drivetrain,
        is_new, is_m_performance, base_price, image_data, image_mime_type, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      modelName.trim(),
      category.trim(),
      series.trim(),
      variantLabel ?? DEFAULT_VARIANT,
      drivetrain,
      isNew,
      isMPerformance,
      price.value,
      req.file ? req.file.buffer : null,
      req.file ? req.file.mimetype : null,
      req.user.id,
    ],
  )

  const vehicle = await findVehicleById(rows[0].id)
  return res.status(201).json(vehicle)
}

async function updateVehicle(req, res) {
  const existing = await findVehicleById(req.params.id)
  if (!existing) {
    return res.status(404).json({ error: 'Véhicule introuvable.' })
  }

  const body = coerceBody(req.body)
  const { errors, price } = validateVehicleFields(body, { partial: true })
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') })
  }

  body.basePrice = price.value
  const { fields, values } = buildUpdate(body)

  // Image : mise à jour UNIQUEMENT si un fichier est fourni (ne jamais
  // écraser l'image existante avec NULL).
  if (req.file) {
    fields.push('image_data = $' + (fields.length + 1))
    fields.push('image_mime_type = $' + (fields.length + 2))
    values.push(req.file.buffer, req.file.mimetype)
  }

  if (fields.length > 0) {
    values.push(existing.id)
    await query(
      `UPDATE vehicles SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`,
      values,
    )
  }

  const vehicle = await findVehicleById(existing.id)
  return res.json(vehicle)
}

async function getVehicle(req, res) {
  const vehicle = await findVehicleById(req.params.id)
  if (!vehicle) {
    return res.status(404).json({ error: 'Véhicule introuvable.' })
  }
  res.json(vehicle)
}

async function deleteVehicle(req, res) {
  const { rowCount } = await query(
    `UPDATE vehicles SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL`,
    [req.params.id],
  )
  if (rowCount === 0) {
    return res.status(404).json({ error: 'Véhicule introuvable.' })
  }
  return res.json({ ok: true })
}

async function restoreVehicle(req, res) {
  const { rowCount } = await query(
    `UPDATE vehicles SET deleted_at = NULL, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NOT NULL`,
    [req.params.id],
  )
  if (rowCount === 0) {
    return res.status(404).json({ error: 'Véhicule introuvable ou déjà actif.' })
  }
  const vehicle = await findVehicleById(req.params.id)
  res.json(vehicle)
}

const router = Router()

router.use(authenticate)
router.use(requireRole(ROLES.ADMIN))

router.get('/', listVehicles)
router.post('/', checkPermission('can_manage_vehicles'), upload.single('image'), createVehicle)
router.get('/:id', getVehicle)
router.put('/:id/restore', checkPermission('can_manage_vehicles'), restoreVehicle)
router.put('/:id', checkPermission('can_manage_vehicles'), upload.single('image'), updateVehicle)
router.delete('/:id', checkPermission('can_manage_vehicles'), deleteVehicle)

module.exports = router