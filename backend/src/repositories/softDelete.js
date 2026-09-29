const { prisma } = require('../db')

const SOFT_DELETABLE = new Set(['users', 'vehicles', 'carts'])
const ACTIVE_WHERE = 'deleted_at IS NULL'

// Modèles Prisma correspondant aux tables soumises au soft delete.
const MODELS = {
  users: prisma.users,
  vehicles: prisma.vehicles,
  carts: prisma.carts,
}

function modelFor(table) {
  if (!SOFT_DELETABLE.has(table)) {
    throw new Error(`Table non soumise au soft delete : ${table}`)
  }
  return MODELS[table]
}

async function softDelete(table, id) {
  const result = await modelFor(table).updateMany({
    where: { id, deleted_at: null },
    data: { deleted_at: new Date(), updated_at: new Date() },
  })
  return result.count > 0
}

async function findActive(table, id) {
  return modelFor(table).findFirst({ where: { id, deleted_at: null } })
}

async function listActive(table, limit = 100) {
  return modelFor(table).findMany({
    where: { deleted_at: null },
    orderBy: { id: 'desc' },
    take: limit,
  })
}

async function anonymizeUser(id) {
  const result = await prisma.users.updateMany({
    where: { id, deleted_at: { not: null } },
    data: {
      email: `anonyme-${id}@deleted`,
      password_hash: '',
      two_factor_secret: null,
      is_two_factor_enabled: false,
      updated_at: new Date(),
    },
  })
  return result.count > 0
}

module.exports = { SOFT_DELETABLE, ACTIVE_WHERE, softDelete, findActive, listActive, anonymizeUser }
