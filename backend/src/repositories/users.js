const { query } = require('../db')
const { hashPassword } = require('../auth/passwords')
const { ROLES } = require('../roles')

const USER_SELECT = `
  SELECT u.id, u.email, u.first_name, u.last_name, u.password_hash,
         u.two_factor_secret, u.is_two_factor_enabled, u.is_active,
         u.activation_expires_at, u.is_super_admin,
         (u.profile_photo_data IS NOT NULL) AS has_profile_photo,
         u.created_at, u.deleted_at, r.name AS role
    FROM users u
    JOIN roles r ON r.id = u.role_id
`

async function findById(id) {
  const { rows } = await query(`${USER_SELECT} WHERE u.id = $1`, [id])
  return rows[0] || null
}

async function findByEmail(email) {
  const { rows } = await query(`${USER_SELECT} WHERE LOWER(u.email) = LOWER($1)`, [email])
  return rows[0] || null
}

async function getRoleId(name) {
  const { rows } = await query('SELECT id FROM roles WHERE name = $1', [name])
  return rows[0] ? rows[0].id : null
}

async function createClient({ firstName, lastName, email, password }) {
  const clientRoleId = await getRoleId(ROLES.CLIENT)
  const passwordHash = await hashPassword(password)
  const { rows } = await query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [firstName, lastName, email, passwordHash, clientRoleId],
  )
  return findById(rows[0].id)
}

async function createClientWithActivation({
  firstName,
  lastName,
  email,
  password,
  activationHash,
  activationExpiresAt,
}) {
  const clientRoleId = await getRoleId(ROLES.CLIENT)
  const passwordHash = await hashPassword(password)
  const { rows } = await query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role_id,
                        activation_token_hash, activation_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      firstName,
      lastName,
      email,
      passwordHash,
      clientRoleId,
      activationHash,
      activationExpiresAt,
    ],
  )
  return findById(rows[0].id)
}

async function findByActivationHash(activationHash) {
  const { rows } = await query(
    `${USER_SELECT} WHERE u.activation_token_hash = $1`,
    [activationHash],
  )
  return rows[0] || null
}

async function activateUser(id) {
  const { rowCount } = await query(
    `UPDATE users
        SET is_active = TRUE, activation_token_hash = NULL,
            activation_expires_at = NULL, updated_at = NOW()
      WHERE id = $1`,
    [id],
  )
  return rowCount > 0
}

async function setTwoFactorSecret(id, secret) {
  await query(
    'UPDATE users SET two_factor_secret = $2, updated_at = NOW() WHERE id = $1',
    [id, secret],
  )
}

async function enableTwoFactor(id) {
  await query(
    'UPDATE users SET is_two_factor_enabled = TRUE, updated_at = NOW() WHERE id = $1',
    [id],
  )
}

async function updateRole(id, roleName) {
  const roleId = await getRoleId(roleName)
  if (!roleId) return false
  await query('UPDATE users SET role_id = $2, updated_at = NOW() WHERE id = $1', [id, roleId])
  return true
}

async function listUsers(limit = 100, role = null) {
  const roles = []
  if (limit !== undefined) roles.push(limit)
  if (role) roles.push(role)
  const { rows } = await query(
    `${USER_SELECT} WHERE u.deleted_at IS NULL
     ${role ? 'AND r.name = $2' : ''}
     ORDER BY u.created_at DESC LIMIT $1`,
    roles,
  )
  return rows
}

async function softDeleteUser(id) {
  const { rowCount } = await query(
    'UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    [id],
  )
  return rowCount > 0
}

module.exports = {
  usersRepo: {
    findById,
    findByEmail,
    createClient,
    createClientWithActivation,
    findByActivationHash,
    activateUser,
    setTwoFactorSecret,
    enableTwoFactor,
    updateRole,
    listUsers,
    softDeleteUser,
  },
}