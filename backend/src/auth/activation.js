const crypto = require('crypto')

const ACTIVATION_EXPIRES_MINUTES = Number(
  process.env.ACTIVATION_EXPIRES_MINUTES || 24 * 60,
)
const ACTIVATION_EXPIRES_MS = ACTIVATION_EXPIRES_MINUTES * 60 * 1000

function generateActivationToken() {
  return crypto.randomBytes(32).toString('hex')
}

function hashActivationToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function getActivationExpiry() {
  return new Date(Date.now() + ACTIVATION_EXPIRES_MS)
}

module.exports = {
  generateActivationToken,
  hashActivationToken,
  getActivationExpiry,
  ACTIVATION_EXPIRES_MS,
  ACTIVATION_EXPIRES_MINUTES,
}