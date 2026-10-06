const { Router } = require('express')
const { prisma, pgSafe } = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { checkPermission } = require('../middleware/checkPermission')
const upload = require('../middleware/upload')
const { ROLES } = require('../roles')
const { buildImageFields } = require('../utils/imagePersistence')
const accessoryService = require('../services/accessoryService')

const DRIVETRAINS = ['electric', 'hybrid', 'petrol', 'diesel', 'concept', 'protection']
const DEFAULT_VARIANT = 'Models'
// Nom de fichier simple, sans chemin : le préfixe `/models/exteriors/` ou
// `/models/interiors/` est ajouté côté serveur, jamais l'inverse.
const MODEL_FILENAME = /^[A-Za-z0-9._-]+\.glb$/
const MODEL_FILENAME_MAX = 255
const MODEL_FILENAMES = ['model3dExteriorFilename', 'model3dInteriorFilename']

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
    '/api/vehicles/' || v.id || '/image?v=' || COALESCE((EXTRACT(EPOCH FROM v.image_updated_at) * 1000)::bigint, 0) AS "image",
    NULLIF(v.model3d_exterior_filename, '') IS NOT NULL AS "has3dExterior",
    CASE WHEN NULLIF(v.model3d_exterior_filename, '') IS NOT NULL
         THEN '/models/exteriors/' || v.model3d_exterior_filename END AS "exteriorModelUrl",
    NULLIF(v.model3d_interior_filename, '') IS NOT NULL AS "has3dInterior",
    CASE WHEN NULLIF(v.model3d_interior_filename, '') IS NOT NULL
         THEN '/models/interiors/' || v.model3d_interior_filename END AS "interiorModelUrl",
    v.model3d_exterior_filename AS "model3dExteriorFilename",
    v.model3d_interior_filename AS "model3dInteriorFilename",
    ARRAY(SELECT va.accessory_id FROM vehicle_accessories va WHERE va.vehicle_id = v.id) AS "accessoryIds",
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

// Un champ de nom de fichier est optionnel. Trois états distincts, tous
// conservés tels quels pour `buildData` :
//   undefined -> non fourni, la colonne n'est pas touchée (PUT partiel) ;
//   ''        -> l'admin veut VIDER le champ, on stocke NULL ;
//   'ix.glb'  -> valeur normalisée.
// Sans cette normalisation, `''` deviendrait une URL non NULL
// (`'/models/exteriors/' || ''`) et activerait le bouton 360 vers rien.
function toOptionalFilename(value) {
  if (value === undefined) return undefined
  if (value === null) return null
  const trimmed = String(value).trim()
  return trimmed === '' ? null : trimmed
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
    model3dExteriorFilename: toOptionalFilename(source.model3dExteriorFilename),
    model3dInteriorFilename: toOptionalFilename(source.model3dInteriorFilename),
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

  // Champs optionnels : `undefined` (non fourni) et `null` (volonté
  // d'effacer) sont tous deux légitimes, seule une valeur fournie est
  // validée. Le motif exclut `/` et `..` : l'URL publique est construite par
  // le serveur en préfixant le nom, une traversée de chemin serait donc
  // servie telle quelle.
  for (const field of MODEL_FILENAMES) {
    const value = (body || {})[field]
    if (value === undefined || value === null) continue
    if (typeof value !== 'string') {
      errors.push(`${field} doit être un nom de fichier.`)
      continue
    }
    if (value.length > MODEL_FILENAME_MAX) {
      errors.push(`${field} : ${MODEL_FILENAME_MAX} caractères maximum.`)
      continue
    }
    if (!MODEL_FILENAME.test(value)) {
      errors.push(
        `${field} doit être un nom de fichier .glb (ex. : ix.glb), sans chemin.`,
      )
    }
  }

  return { errors, price }
}

function buildData(body) {
  const data = {}

  const fieldMap = {
    modelName: 'model_name',
    category: 'category',
    series: 'series',
    variantLabel: 'variant_label',
    drivetrain: 'drivetrain',
    isNew: 'is_new',
    isMPerformance: 'is_m_performance',
    basePrice: 'base_price',
    model3dExteriorFilename: 'model3d_exterior_filename',
    model3dInteriorFilename: 'model3d_interior_filename',
  }

  for (const [key, field] of Object.entries(fieldMap)) {
    if (body[key] === undefined) continue
    data[field] = body[key]
  }

  return data
}

async function findVehicleById(id) {
  const rows = await prisma.$queryRawUnsafe(`${VEHICLE_SELECT} WHERE v.id = $1`, id)
  return rows.length ? pgSafe(rows[0]) : null
}

async function listVehicles(req, res) {
  const rows = await prisma.$queryRawUnsafe(`${VEHICLE_SELECT} ORDER BY v.created_at DESC`)
  res.json(pgSafe(rows))
}

async function createVehicle(req, res) {
  const body = coerceBody(req.body)
  const { modelName = '', category = '', series = '', variantLabel, drivetrain, isNew, isMPerformance, basePrice } =
    body

  const { errors, price } = validateVehicleFields(body)
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') })
  }

  const id = require('crypto').randomUUID()
  const created = await prisma.vehicles.create({
    data: {
      id,
      model_name: modelName.trim(),
      category: category.trim(),
      series: series.trim(),
      variant_label: variantLabel ?? DEFAULT_VARIANT,
      drivetrain,
      is_new: isNew,
      is_m_performance: isMPerformance,
      base_price: price.value,
      model3d_exterior_filename: body.model3dExteriorFilename ?? null,
      model3d_interior_filename: body.model3dInteriorFilename ?? null,
      ...(await buildImageFields({ file: req.file, scope: 'vehicles', id })),
      created_by: req.user.id,
    },
    select: { id: true },
  })

  const vehicle = await findVehicleById(created.id)
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
  const data = buildData(body)

  // Image : mise à jour UNIQUEMENT si un fichier est fourni (ne jamais
  // écraser l'image existante avec NULL).
  if (req.file) {
    Object.assign(
      data,
      await buildImageFields({ file: req.file, scope: 'vehicles', id: existing.id }),
    )
  }

  if (Object.keys(data).length > 0) {
    data.updated_at = new Date()
    await prisma.vehicles.update({ where: { id: existing.id }, data })
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
  const result = await prisma.vehicles.updateMany({
    where: { id: req.params.id, deleted_at: null },
    data: { deleted_at: new Date(), updated_at: new Date() },
  })
  if (result.count === 0) {
    return res.status(404).json({ error: 'Véhicule introuvable.' })
  }
  return res.json({ ok: true })
}

// Remplace la liste des accessoires rattachés au véhicule. L'admin envoie la
// sélection complète (`accessoryIds`), le serveur remplace l'ensemble.
async function updateVehicleAccessories(req, res) {
  const existing = await findVehicleById(req.params.id)
  if (!existing) {
    return res.status(404).json({ error: 'Véhicule introuvable.' })
  }

  const accessoryIds = req.body?.accessoryIds
  if (!Array.isArray(accessoryIds)) {
    return res.status(400).json({ error: 'accessoryIds doit être un tableau.' })
  }

  const { invalid, unknown } = await accessoryService.setVehicleAccessories(
    existing.id,
    accessoryIds,
  )
  if (invalid.length > 0 || unknown.length > 0) {
    return res
      .status(400)
      .json({ error: 'Un ou plusieurs accessoires sont invalides ou introuvables.' })
  }

  const vehicle = await findVehicleById(existing.id)
  return res.json(vehicle)
}

async function restoreVehicle(req, res) {
  const result = await prisma.vehicles.updateMany({
    where: { id: req.params.id, deleted_at: { not: null } },
    data: { deleted_at: null, updated_at: new Date() },
  })
  if (result.count === 0) {
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
router.put('/:id/accessories', checkPermission('can_manage_vehicles'), updateVehicleAccessories)
router.put('/:id', checkPermission('can_manage_vehicles'), upload.single('image'), updateVehicle)
router.delete('/:id', checkPermission('can_manage_vehicles'), deleteVehicle)

module.exports = router
