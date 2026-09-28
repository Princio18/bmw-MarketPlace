function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise' })
  }
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ error: 'Accès réservé aux Super Admins' })
  }
  return next()
}

module.exports = { requireSuperAdmin }