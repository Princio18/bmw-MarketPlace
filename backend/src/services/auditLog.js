const { prisma } = require('../db')
const { background } = require('../utils/background')

// Clés jamais journalisées : un secret dans le journal d'audit annulerait le
// bénéfice de sécurité qu'on cherche à obtenir.
const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'password_hash',
  'token',
  'temptoken',
  'accesstoken',
  'refreshtoken',
  'activation_token',
  'activation_token_hash',
  'secret',
  'clientsecret',
  'two_factor_secret',
  'authorization',
  'html',
])

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function sanitize(value, depth = 0) {
  if (depth > 4) return '[tronque]'
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitize(item, depth + 1))
  }
  if (typeof value === 'object') {
    const result = {}
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(String(key).toLowerCase())) continue
      result[key] = sanitize(val, depth + 1)
    }
    return result
  }
  if (typeof value === 'string' && value.length > 500) {
    return `${value.slice(0, 500)}...`
  }
  return value
}

// Journalise une action sensible d'administration. Toujours en arrière-plan :
// le journal ne doit jamais faire échouer ni ralentir la requête d'origine.
function logAudit(req, action, entityType = null, entityId = null, metadata = null) {
  const adminId = req?.user?.id ?? null
  const safeEntityId =
    typeof entityId === 'string' && UUID_RE.test(entityId) ? entityId : null

  let safeMetadata = null
  if (metadata && typeof metadata === 'object') {
    try {
      safeMetadata = sanitize(metadata)
    } catch {
      safeMetadata = null
    }
  }

  return background(
    prisma.audit_log.create({
      data: {
        admin_id: adminId,
        action,
        entity_type: entityType ?? null,
        entity_id: safeEntityId,
        metadata: safeMetadata,
      },
    }),
  )
}

module.exports = { logAudit }
