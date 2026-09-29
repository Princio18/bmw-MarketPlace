const { prisma } = require('../db')

const PERMISSION_KEYS = [
  'can_manage_vehicles',
  'can_manage_orders',
  'can_process_refunds',
  'can_manage_reviews',
  'can_view_reports',
  'can_manage_clients',
]

function checkPermission(key) {
  if (!PERMISSION_KEYS.includes(key)) {
    throw new Error(`Permission inconnue : ${key}`)
  }
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise' })
    }
    if (req.user.isSuperAdmin) {
      return next()
    }
    let allowed = false
    try {
      const row = await prisma.admin_permissions.findUnique({
        where: { user_id: req.user.id },
        select: { [key]: true },
      })
      allowed = row != null && row[key] === true
    } catch {
      allowed = false
    }
    if (!allowed) {
      return res.status(403).json({ error: 'Accès refusé (permission manquante)' })
    }
    return next()
  }
}

module.exports = { checkPermission }
