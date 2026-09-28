const bcrypt = require('bcryptjs')

const BCRYPT_ROUNDS = 10

async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

async function verifyPassword(plain, hash) {
  if (!hash) return false
  return bcrypt.compare(plain, hash)
}

module.exports = { hashPassword, verifyPassword }