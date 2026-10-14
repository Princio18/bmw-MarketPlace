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

// Comme authenticate, mais ne rejette jamais un visiteur : si le token est
// absent/invalide, on poursuit sans req.user (requête anonyme légitime).
// Utile pour les routes publiques qui relient la personne si connectée.
async function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return next()

  try {
    const payload = require('../auth/tokens').verifyToken(token)
    const user = await usersRepo.findById(payload.sub)
    if (user && !user.deleted_at) {
      req.user = user
      req.user.isSuperAdmin = !!user.is_super_admin
      req.user.hasProfilePhoto = !!user.has_profile_photo
    }
  } catch {
    // token invalide ou utilisateur supprimé : on laisse passer anonyme
  }
  return next()
}

module.exports = { authenticate, requireRole, optionalAuthenticate }