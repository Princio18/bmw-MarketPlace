// Restreint l'accès au super administrateur (rôle admin + is_super_admin).
// `req.user.isSuperAdmin` est posé par le middleware d'authentification.
function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise' })
  }
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ error: 'Accès réservé au super administrateur.' })
  }
  return next()
}

module.exports = { requireSuperAdmin }
