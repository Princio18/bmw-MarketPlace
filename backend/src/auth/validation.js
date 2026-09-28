const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(email) {
  return EMAIL_REGEX.test(String(email).trim())
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

module.exports = { EMAIL_REGEX, isValidEmail, validatePassword }