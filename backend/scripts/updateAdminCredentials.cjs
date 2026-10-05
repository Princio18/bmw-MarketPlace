/**
 * Met à jour l'email et le mot de passe du compte super admin existant.
 *
 * Pourquoi un UPDATE et pas un INSERT : conserver le même id préserve toutes les
 * relations rattachées à ce compte (appareils connus, historique). Insérer un
 * second admin laisserait derrière lui l'ancien, toujours actif, jamais purgé,
 * et il resterait connectable.
 *
 * L'email passe par isValidEmail(), qui rejette désormais les TLD non
 * routables (.local, .test, .invalid...) : c'est précisément ce contrôle
 * défaillant qui avait validé admin@bmwautosell.local, adresse vers laquelle
 * aucun serveur SMTP ne peut livrer.
 *
 * Usage :
 *   node scripts/updateAdminCredentials.cjs              # ADMIN_EMAIL + ADMIN_PASSWORD du .env
 *   node scripts/updateAdminCredentials.cjs <email> <mdp> # surcharge explicite
 */
require('dotenv').config()

const { prisma, closeDb } = require('../src/db')
const { hashPassword } = require('../src/auth/passwords')
const { isValidEmail, validatePassword } = require('../src/auth/validation')

function maskEmail(email) {
  const [name, domain] = String(email).split('@')
  if (!domain) return '***@***'
  return `${name.charAt(0)}***@${domain}`
}

async function run() {
  const [emailArg, passwordArg] = process.argv.slice(2)
  const email = String(emailArg || process.env.ADMIN_EMAIL || '').trim()
  const password = passwordArg || process.env.ADMIN_PASSWORD || ''

  if (!email || !password) {
    console.log('[admin:creds] Email et mot de passe requis (arguments ou ADMIN_EMAIL / ADMIN_PASSWORD).')
    return 1
  }

  if (!isValidEmail(email)) {
    console.log(`[admin:creds] Adresse email invalide ou non livrable : ${maskEmail(email)}`)
    return 1
  }

  if (!validatePassword(password)) {
    console.log(
      '[admin:creds] Mot de passe invalide : 10 à 40 caractères, une minuscule, une majuscule, un chiffre et un caractère spécial.',
    )
    return 1
  }

  const admins = await prisma.users.findMany({
    where: { is_super_admin: true },
    select: { id: true, email: true, role: { select: { name: true } } },
  })

  if (admins.length === 0) {
    console.log("[admin:creds] Aucun compte super admin trouvé. Lance d'abord npm run seed:admin.")
    return 1
  }

  if (admins.length > 1) {
    console.log(`[admin:creds] ${admins.length} comptes super admin trouvés, mise à jour ambiguë :`)
    admins.forEach((a) => console.log(`  - ${a.id} ${a.email}`))
    return 1
  }

  const admin = admins[0]

  if (admin.role?.name !== 'admin') {
    console.log(`[admin:creds] Le compte ${admin.email} n'a pas le rôle admin, abandon.`)
    return 1
  }

  // users_email_key est un index UNIQUE : on interroge avant d'écrire pour
  // rendre l'échec explicite plutôt que de laisser remonter une erreur Prisma.
  const conflict = await prisma.users.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, email: true },
  })

  if (conflict && conflict.id !== admin.id) {
    console.log(
      `[admin:creds] L'adresse ${maskEmail(email)} est déjà utilisée par ${conflict.email}, abandon.`,
    )
    return 1
  }

  const passwordHash = await hashPassword(password)

  const updated = await prisma.users.update({
    where: { id: admin.id },
    data: {
      email,
      password_hash: passwordHash,
      is_active: true,
      updated_at: new Date(),
    },
    select: { id: true, email: true, is_active: true },
  })

  // Purge les OTP antérieurs : ils restent acceptables jusqu'à 10 minutes, et
  // ils ont été envoyés à l'ancienne adresse, désormais injoignable.
  const purged = await prisma.admin_email_otps.deleteMany({ where: { user_id: admin.id } })

  console.log('[admin:creds] Compte admin mis à jour.')
  console.log(`  id           : ${updated.id}`)
  console.log(`  ancien email : ${maskEmail(admin.email)}`)
  console.log(`  nouvel email : ${maskEmail(updated.email)}`)
  console.log(`  actif        : ${updated.is_active}`)
  console.log(`  OTP purgés   : ${purged.count}`)
  return 0
}

run()
  .then(async (code) => {
    await closeDb()
    process.exit(code)
  })
  .catch(async (err) => {
    console.error('[admin:creds] Erreur inattendue :', err)
    try {
      await closeDb()
    } catch {
      // client déjà fermé
    }
    process.exit(1)
  })
