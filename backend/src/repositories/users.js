const { prisma } = require('../db')
const { hashPassword } = require('../auth/passwords')
const { ROLES } = require('../roles')

// Sélection identique à l'ancien USER_SELECT (colonnes + rôle + indicateur
// "has_profile_photo") afin de préserver la forme des objets renvoyés.
const USER_SELECT = {
  id: true,
  email: true,
  first_name: true,
  last_name: true,
  password_hash: true,
  two_factor_secret: true,
  is_two_factor_enabled: true,
  is_active: true,
  activation_token_hash: true,
  activation_expires_at: true,
  is_super_admin: true,
  profile_photo_data: true,
  created_at: true,
  deleted_at: true,
  role: { select: { name: true } },
}

function toUserRow(row) {
  if (!row) return null
  const { role, profile_photo_data: photo, ...rest } = row
  return {
    ...rest,
    role: role ? role.name : null,
    has_profile_photo: photo != null,
  }
}

async function findById(id) {
  const row = await prisma.users.findFirst({ where: { id }, select: USER_SELECT })
  return toUserRow(row)
}

async function findByEmail(email) {
  const row = await prisma.users.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: USER_SELECT,
  })
  return toUserRow(row)
}

async function getRoleId(name) {
  const role = await prisma.roles.findFirst({ where: { name }, select: { id: true } })
  return role ? role.id : null
}

// Les roles sont des donnees de reference : sur une base neuve ils n'existent
// pas encore, donc on les cree a la volee (meme approche que
// adminService.getOrCreateAdminRoleId pour le role admin).
async function getOrCreateRoleId(name) {
  const existing = await getRoleId(name)
  if (existing) return existing
  try {
    await prisma.roles.create({ data: { name } })
  } catch (err) {
    if (err.code !== 'P2002') throw err
  }
  const role = await prisma.roles.findFirst({ where: { name }, select: { id: true } })
  return role.id
}

async function createClient({ firstName, lastName, email, password }) {
  const clientRoleId = await getOrCreateRoleId(ROLES.CLIENT)
  const passwordHash = await hashPassword(password)
  const created = await prisma.users.create({
    data: {
      first_name: firstName,
      last_name: lastName,
      email,
      password_hash: passwordHash,
      role_id: clientRoleId,
    },
    select: { id: true },
  })
  return findById(created.id)
}

async function createClientWithActivation({
  firstName,
  lastName,
  email,
  password,
  activationHash,
  activationExpiresAt,
}) {
  const clientRoleId = await getOrCreateRoleId(ROLES.CLIENT)
  const passwordHash = await hashPassword(password)
  const created = await prisma.users.create({
    data: {
      first_name: firstName,
      last_name: lastName,
      email,
      password_hash: passwordHash,
      role_id: clientRoleId,
      activation_token_hash: activationHash,
      activation_expires_at: activationExpiresAt,
    },
    select: { id: true },
  })
  return findById(created.id)
}

async function findByActivationHash(activationHash) {
  const row = await prisma.users.findFirst({
    where: { activation_token_hash: activationHash },
    select: USER_SELECT,
  })
  return toUserRow(row)
}

async function activateUser(id) {
  const result = await prisma.users.updateMany({
    where: { id },
    data: {
      is_active: true,
      activation_token_hash: null,
      activation_expires_at: null,
      updated_at: new Date(),
    },
  })
  return result.count > 0
}

async function setTwoFactorSecret(id, secret) {
  await prisma.users.updateMany({
    where: { id },
    data: { two_factor_secret: secret, updated_at: new Date() },
  })
}

async function enableTwoFactor(id) {
  await prisma.users.updateMany({
    where: { id },
    data: { is_two_factor_enabled: true, updated_at: new Date() },
  })
}

async function updateRole(id, roleName) {
  const roleId = await getRoleId(roleName)
  if (!roleId) return false
  await prisma.users.updateMany({
    where: { id },
    data: { role_id: roleId, updated_at: new Date() },
  })
  return true
}

async function listUsers(limit = 100, role = null) {
  const where = { deleted_at: null }
  if (role) where.role = { name: role }
  const rows = await prisma.users.findMany({
    where,
    select: USER_SELECT,
    orderBy: { created_at: 'desc' },
    take: limit === undefined ? undefined : limit,
  })
  return rows.map(toUserRow)
}

async function softDeleteUser(id) {
  const result = await prisma.users.updateMany({
    where: { id, deleted_at: null },
    data: { deleted_at: new Date(), updated_at: new Date() },
  })
  return result.count > 0
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
