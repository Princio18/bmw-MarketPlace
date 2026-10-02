const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES = process.env.JWT_EXPIRES || '24h'
const JWT_2FA_SECRET = process.env.JWT_2FA_SECRET
const TWO_FACTOR_TOKEN_EXPIRES = '10m'

function requireJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET manquant dans .env (arrêt du serveur)')
  }
}

function requireTwoFactorSecret() {
  if (!JWT_2FA_SECRET) {
    throw new Error('JWT_2FA_SECRET manquant dans .env (arrêt du serveur)')
  }
}

// Une variable manquante est un défaut de configuration, pas une invitation à
// laisser passer : les 2 routes de vérification doivent donc REFUSER le jeton
// (401), jamais lever. Lever ici transformait une erreur de config en 500 et
// masquait la cause réelle derrière un message générique.
function isTwoFactorConfigured() {
  return Boolean(JWT_2FA_SECRET)
}

function signAccessToken(user) {
  requireJwtSecret()
  return jwt.sign(
    { sub: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  )
}

function signTwoFactorToken(userId, purpose, extra = {}) {
  requireTwoFactorSecret()
  return jwt.sign({ userId, purpose, ...extra }, JWT_2FA_SECRET, {
    expiresIn: TWO_FACTOR_TOKEN_EXPIRES,
  })
}

function verifyTwoFactorToken(token) {
  if (!JWT_2FA_SECRET) return null
  try {
    return jwt.verify(token, JWT_2FA_SECRET)
  } catch {
    return null
  }
}

function verifyToken(token) {
  if (!JWT_SECRET) return null
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

module.exports = {
  signAccessToken,
  signTwoFactorToken,
  verifyTwoFactorToken,
  verifyToken,
  requireJwtSecret,
  isTwoFactorConfigured,
}