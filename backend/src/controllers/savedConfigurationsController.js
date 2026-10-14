const { prisma, pgSafe } = require('../db')

const MAX_ACTIVE_CONFIGURATIONS = 20
const MAX_CONFIGURATION_DATA_BYTES = 256 * 1024

function trimOrNull(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function validateConfigurationData(value) {
  if (value === undefined || value === null) {
    return { error: 'Données de configuration requises.' }
  }
  if (Array.isArray(value) || typeof value !== 'object') {
    return { error: 'Données de configuration invalides.' }
  }
  try {
    const size = Buffer.byteLength(JSON.stringify(value), 'utf8')
    if (size > MAX_CONFIGURATION_DATA_BYTES) {
      return { error: 'Données de configuration trop volumineuses.' }
    }
  } catch {
    return { error: 'Données de configuration invalides.' }
  }
  return { value }
}

// POST /api/saved-configurations — enregistre une configuration (« Save only »).
async function createSavedConfiguration(req, res) {
  const body = req.body || {}

  const vehicleId = trimOrNull(body.vehicleId)
  if (!vehicleId) {
    return res.status(400).json({ error: 'Véhicule requis.' })
  }

  const vehicle = await prisma.vehicles.findFirst({
    where: { id: vehicleId, deleted_at: null },
    select: { id: true },
  })
  if (!vehicle) {
    return res.status(400).json({ error: 'Véhicule invalide.' })
  }

  const configurationData = validateConfigurationData(body.configurationData)
  if ('error' in configurationData) {
    return res.status(400).json({ error: configurationData.error })
  }

  const activeCount = await prisma.saved_configurations.count({
    where: { user_id: req.user.id, deleted_at: null },
  })
  if (activeCount >= MAX_ACTIVE_CONFIGURATIONS) {
    return res.status(400).json({
      error: `Vous ne pouvez pas enregistrer plus de ${MAX_ACTIVE_CONFIGURATIONS} configurations.`,
    })
  }

  try {
    const saved = await prisma.saved_configurations.create({
      data: {
        user_id: req.user.id,
        vehicle_id: vehicleId,
        configuration_data: configurationData.value,
      },
      select: { id: true },
    })
    return res.status(201).json({ id: saved.id })
  } catch (err) {
    console.error('[saved-configurations] Erreur POST :', err)
    return res.status(500).json({ error: "Impossible d'enregistrer la configuration." })
  }
}

// GET /api/saved-configurations — configurations actives de l'utilisateur,
// avec le nom du véhicule, plus récentes d'abord.
async function listSavedConfigurations(req, res) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       s.id,
       s.vehicle_id AS "vehicleId",
       s.configuration_data AS "configurationData",
       s.created_at AS "createdAt",
       v.model_name AS "modelName",
       v.variant_label AS "variantLabel",
       '/api/vehicles/' || v.id || '/image?v=' || COALESCE((EXTRACT(EPOCH FROM v.image_updated_at) * 1000)::bigint, 0) AS "image"
     FROM saved_configurations s
     JOIN vehicles v ON v.id = s.vehicle_id
     WHERE s.user_id = $1 AND s.deleted_at IS NULL
     ORDER BY s.created_at DESC`,
    req.user.id,
  )
  return res.json({ configurations: pgSafe(rows) })
}

// DELETE /api/saved-configurations/:id — suppression douce, propriétaire only.
async function deleteSavedConfiguration(req, res) {
  const existing = await prisma.saved_configurations.findFirst({
    where: { id: req.params.id, user_id: req.user.id, deleted_at: null },
    select: { id: true },
  })
  if (!existing) {
    return res.status(404).json({ error: 'Configuration introuvable.' })
  }

  await prisma.saved_configurations.update({
    where: { id: existing.id },
    data: { deleted_at: new Date() },
  })
  return res.json({ deleted: true })
}

module.exports = {
  createSavedConfiguration,
  listSavedConfigurations,
  deleteSavedConfiguration,
}
