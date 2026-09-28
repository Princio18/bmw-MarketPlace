const { query } = require('../db')
const { usersRepo } = require('../repositories/users')
const { hashPassword } = require('../auth/passwords')
const { ROLES } = require('../roles')

async function getOrCreateAdminRoleId() {
  const { rows } = await query("SELECT id FROM roles WHERE name = $1", [ROLES.ADMIN])
  if (rows.length > 0) return rows[0].id
  await query("INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [ROLES.ADMIN])
  const { rows: after } = await query("SELECT id FROM roles WHERE name = $1", [ROLES.ADMIN])
  return after[0].id
}

// Logique unique de création d'un compte admin (hash + insertion),
// partagée entre scripts/seedAdmin.js et POST /api/admin/create-admin.
async function createAdminUser({ email, password, firstName = '', lastName = '', isSuperAdmin = false }) {
  const normalizedEmail = String(email).trim()

  if (await usersRepo.findByEmail(normalizedEmail)) {
    return { created: false, user: null }
  }

  const roleId = await getOrCreateAdminRoleId()
  const passwordHash = await hashPassword(password)

  const { rows } = await query(
    `INSERT INTO users (email, password_hash, role_id, first_name, last_name,
                        is_two_factor_enabled, is_super_admin)
     VALUES ($1, $2, $3, $4, $5, false, $6)
     RETURNING id`,
    [normalizedEmail, passwordHash, roleId, firstName, lastName, isSuperAdmin],
  )

  return {
    created: true,
    user: { id: rows[0].id, email: normalizedEmail, role: ROLES.ADMIN },
  }
}

module.exports = { createAdminUser }