require('dotenv').config()

const { closePool } = require('../src/db')
const { usersRepo } = require('../src/repositories/users')
const { createAdminUser } = require('../src/services/adminService')
const { isValidEmail, validatePassword } = require('../src/auth/validation')

function maskEmail(email) {
  const [name, domain] = String(email).split('@')
  if (!domain) return '***@***'
  return `${name.charAt(0)}***@${domain}`
}

async function run() {
  const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim()
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''
  const ADMIN_FIRST_NAME = (process.env.ADMIN_FIRST_NAME || '').trim()
  const ADMIN_LAST_NAME = (process.env.ADMIN_LAST_NAME || '').trim()

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('[seed:admin] ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans .env')
    return 1
  }

  if (!ADMIN_FIRST_NAME || !ADMIN_LAST_NAME) {
    console.log(
      '[seed:admin] ADMIN_FIRST_NAME et ADMIN_LAST_NAME doivent être définis dans .env (p. ex. John / Doe).',
    )
    return 1
  }

  if (!isValidEmail(ADMIN_EMAIL)) {
    console.log(`[seed:admin] Adresse email invalide : ${maskEmail(ADMIN_EMAIL)}`)
    return 1
  }

  if (!validatePassword(ADMIN_PASSWORD)) {
    console.log(
      '[seed:admin] Mot de passe invalide : 10 à 40 caractères, une minuscule, une majuscule, un chiffre et un caractère spécial.',
    )
    return 1
  }

  if (await usersRepo.findByEmail(ADMIN_EMAIL)) {
    console.log('[seed:admin] Un compte existe déjà pour cet email, aucune action effectuée.')
    return 0
  }

  const { created } = await createAdminUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    firstName: ADMIN_FIRST_NAME,
    lastName: ADMIN_LAST_NAME,
    isSuperAdmin: true,
  })
  if (!created) {
    console.log('[seed:admin] Un compte existe déjà pour cet email, aucune action effectuée.')
    return 0
  }

  console.log(`[seed:admin] Compte admin créé avec succès (email masqué : ${maskEmail(ADMIN_EMAIL)}).`)
  return 0
}

run()
  .then(async (code) => {
    await closePool()
    process.exit(code)
  })
  .catch(async (err) => {
    console.error('[seed:admin] Erreur inattendue :', err)
    try {
      await closePool()
    } catch {
      // pool déjà fermé
    }
    process.exit(1)
  })