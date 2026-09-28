const { usersRepo } = require('../repositories/users')
const { ROLES } = require('../roles')

async function authenticate(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const payload = token ? require('../auth/tokens').verifyToken(token) : null

  if (!payload) {
    return res.status(401).json({ error: 'Authentification requise' })
  }

  const user = await usersRepo.findById(payload.sub)
  if (!user) {
    return res.status(401).json({ error: 'Utilisateur introuvable' })
  }
  if (user.deleted_at) {
    return res.status(401).json({ error: 'Compte désactivé' })
  }
  if (user.role === ROLES.CLIENT && !user.is_active) {
    return res.status(403).json({ error: 'Compte non activé' })
  }

  req.user = user
  req.user.isSuperAdmin = !!user.is_super_admin
  req.user.hasProfilePhoto = !!user.has_profile_photo
  return next()
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise' })
    }
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: 'Accès refusé (rôle insuffisant)' })
    }
    return next()
  }
}

module.exports = { authenticate, requireRole }