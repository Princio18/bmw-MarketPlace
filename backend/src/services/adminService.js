const { prisma } = require('../db')
const { usersRepo } = require('../repositories/users')
const { hashPassword } = require('../auth/passwords')
const { ROLES } = require('../roles')

async function getOrCreateAdminRoleId() {
  let role = await prisma.roles.findFirst({ where: { name: ROLES.ADMIN }, select: { id: true } })
  if (role) return role.id
  try {
    await prisma.roles.create({ data: { name: ROLES.ADMIN } })
  } catch (err) {
    if (err.code !== 'P2002') throw err
  }
  role = await prisma.roles.findFirst({ where: { name: ROLES.ADMIN }, select: { id: true } })
  return role.id
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

  const created = await prisma.users.create({
    data: {
      email: normalizedEmail,
      password_hash: passwordHash,
      role_id: roleId,
      first_name: firstName,
      last_name: lastName,
      is_two_factor_enabled: false,
      is_super_admin: isSuperAdmin,
    },
    select: { id: true },
  })

  return {
    created: true,
    user: { id: created.id, email: normalizedEmail, role: ROLES.ADMIN },
  }
}

module.exports = { createAdminUser }
