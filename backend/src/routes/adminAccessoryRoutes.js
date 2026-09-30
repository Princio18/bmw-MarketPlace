const { Router } = require('express')
const { prisma } = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { checkPermission } = require('../middleware/checkPermission')
const upload = require('../middleware/upload')
const { ROLES } = require('../roles')
const accessoryService = require('../services/accessoryService')

function toBool(value) {
  return value === true || value === 'true' || value === '1'
}

// Stock : entier >= 0, valeur vide => 0.
function parseStock(value) {
  if (value === undefined || value === null || value === '') return { value: 0 }
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) {
    return { error: 'stockQuantity doit être un entier positif ou nul.' }
  }
  return { value: n }
}

function parsePrice(value) {
  if (value === undefined || value === null || value === '') {
    return { error: 'price est obligatoire.' }
  }
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) {
    return { error: 'Prix invalide : nombre positif attendu.' }
  }
  return { value: n }
}

function validateAccessoryFields(body, { partial = false } = {}) {
  const errors = []
  const { name, price } = body || {}

  if (!partial || name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      errors.push('name est obligatoire.')
    }
  }
  if (!partial || price !== undefined) {
    const parsed = parsePrice(price)
    if (parsed.error) errors.push(parsed.error)
  }
  return { errors, price: parsePrice(price).value }
}

// Construit le jeu de champs Prisma. `undefined` = colonne non touchée
// (PATCH sémantique) : indispensable pour ne pas écraser une valeur existante.
function buildData(body) {
  const data = {}
  const fieldMap = {
    name: 'name',
    description: 'description',
    badge: 'badge',
    stockQuantity: 'stock_quantity',
  }
  for (const [key, field] of Object.entries(fieldMap)) {
    if (body[key] === undefined) continue
    data[field] = body[key]
  }
  if (body.price !== undefined) data.price = parsePrice(body.price).value
  if (body.requiresAdjustment !== undefined) {
    data.requires_adjustment = toBool(body.requiresAdjustment)
  }
  return data
}

function notFound(res) {
  return res.status(404).json({ error: 'Accessoire introuvable.' })
}

async function listAccessories(req, res) {
  const accessories = await accessoryService.listAllAccessories()
  return res.json({ accessories })
}

async function getAccessory(req, res) {
  if (!accessoryService.isValidAccessoryId(req.params.id)) return notFound(res)
  const accessory = await accessoryService.findAccessoryById(req.params.id)
  if (!accessory) {
    return notFound(res)
  }
  return res.json(accessory)
}

async function createAccessory(req, res) {
  const body = req.body || {}
  const { errors, price } = validateAccessoryFields(body)
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') })
  }
  const stock = parseStock(body.stockQuantity)
  if (stock.error) {
    return res.status(400).json({ error: stock.error })
  }

  const created = await prisma.accessories.create({
    data: {
      name: String(body.name).trim(),
      description: body.description ? String(body.description).trim() : null,
      price,
      badge: body.badge ? String(body.badge).trim() : null,
      requires_adjustment: toBool(body.requiresAdjustment),
      stock_quantity: stock.value,
      image_data: req.file ? req.file.buffer : null,
      image_mime_type: req.file ? req.file.mimetype : null,
    },
    select: { id: true },
  })

  return res.status(201).json(await accessoryService.findAccessoryById(created.id))
}

async function updateAccessory(req, res) {
  if (!accessoryService.isValidAccessoryId(req.params.id)) return notFound(res)
  const existing = await accessoryService.findAccessoryById(req.params.id)
  if (!existing) {
    return notFound(res)
  }

  const body = req.body || {}
  const { errors, price } = validateAccessoryFields(body, { partial: true })
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') })
  }

  const data = buildData(body)
  if (body.price !== undefined) data.price = price
  if (body.stockQuantity !== undefined) {
    const stock = parseStock(body.stockQuantity)
    if (stock.error) {
      return res.status(400).json({ error: stock.error })
    }
    data.stock_quantity = stock.value
  }

  // Image : mise à jour UNIQUEMENT si un fichier est fourni (ne jamais
  // écraser l'image existante avec NULL).
  if (req.file) {
    data.image_data = req.file.buffer
    data.image_mime_type = req.file.mimetype
  }

  if (Object.keys(data).length > 0) {
    await prisma.accessories.update({ where: { id: existing.id }, data })
  }

  return res.json(await accessoryService.findAccessoryById(existing.id))
}

async function deleteAccessory(req, res) {
  if (!accessoryService.isValidAccessoryId(req.params.id)) return notFound(res)
  const result = await prisma.accessories.updateMany({
    where: { id: req.params.id, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  if (result.count === 0) {
    return notFound(res)
  }
  return res.json({ ok: true })
}

async function restoreAccessory(req, res) {
  if (!accessoryService.isValidAccessoryId(req.params.id)) return notFound(res)
  const result = await prisma.accessories.updateMany({
    where: { id: req.params.id, deleted_at: { not: null } },
    data: { deleted_at: null },
  })
  if (result.count === 0) {
    return res.status(404).json({ error: 'Accessoire introuvable ou déjà actif.' })
  }
  return res.json(await accessoryService.findAccessoryById(req.params.id))
}

const router = Router()

router.use(authenticate)
router.use(requireRole(ROLES.ADMIN))

// Mêmes règles que /api/admin/vehicles : rôle admin + can_manage_vehicles.
// checkPermission est posé AVANT upload.single pour rejeter un utilisateur non
// autorisé sans lire le corps multipart.
const canManage = checkPermission('can_manage_vehicles')

router.get('/', canManage, listAccessories)
router.post('/', canManage, upload.single('image'), createAccessory)
router.get('/:id', canManage, getAccessory)
router.put('/:id/restore', canManage, restoreAccessory)
router.put('/:id', canManage, upload.single('image'), updateAccessory)
router.delete('/:id', canManage, deleteAccessory)

module.exports = router
