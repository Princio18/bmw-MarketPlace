const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// TLD qui passent le contrôle syntaxique mais ne sont jamais routables sur
// Internet public (RFC 2606, RFC 6761, RFC 6762). Aucun message ne peut y
// arriver : les accepter crée des comptes structurellement injoignables, dont
// l'admin@bmwautosell.local qui rendait la connexion OTP impossible.
const UNDELIVERABLE_TLDS = new Set([
  'local',
  'localhost',
  'internal',
  'invalid',
  'test',
  'example',
])

function isValidEmail(email) {
  const value = String(email).trim()
  if (!EMAIL_REGEX.test(value)) return false

  const domain = value.slice(value.indexOf('@') + 1).toLowerCase()
  const tld = domain.slice(domain.lastIndexOf('.') + 1)
  return !UNDELIVERABLE_TLDS.has(tld)
}

// Même règle que la route /api/auth/register.
function validatePassword(password) {
  const rules = {
    length: typeof password === 'string' && password.length >= 10 && password.length <= 40,
    lowercase: /[a-z]/.test(password || ''),
    uppercase: /[A-Z]/.test(password || ''),
    number: /[0-9]/.test(password || ''),
    special: /[^A-Za-z0-9]/.test(password || ''),
  }
  return Object.values(rules).every(Boolean)
}

module.exports = { EMAIL_REGEX, UNDELIVERABLE_TLDS, isValidEmail, validatePassword }