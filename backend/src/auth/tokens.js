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
  requireTwoFactorSecret()
  try {
    return jwt.verify(token, JWT_2FA_SECRET)
  } catch {
    return null
  }
}

function verifyToken(token) {
  requireJwtSecret()
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
}