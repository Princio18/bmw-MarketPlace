const { query } = require('../db')

const SOFT_DELETABLE = new Set(['users', 'vehicles', 'carts'])
const ACTIVE_WHERE = 'deleted_at IS NULL'

async function softDelete(table, id) {
  if (!SOFT_DELETABLE.has(table)) {
    throw new Error(`Table non soumise au soft delete : ${table}`)
  }
  const result = await query(
    `UPDATE ${table}
        SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  )
  return result.rowCount > 0
}

async function findActive(table, id) {
  const result = await query(
    `SELECT * FROM ${table} WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  )
  return result.rows[0] || null
}

async function listActive(table, limit = 100) {
  const result = await query(
    `SELECT * FROM ${table}
      WHERE deleted_at IS NULL
      ORDER BY id DESC
      LIMIT $1`,
    [limit],
  )
  return result.rows
}

async function anonymizeUser(id) {
  const result = await query(
    `UPDATE users
        SET email = CONCAT('anonyme-', id, '@deleted'),
            password_hash = '',
            two_factor_secret = NULL,
            is_two_factor_enabled = FALSE,
            updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NOT NULL`,
    [id],
  )
  return result.rowCount > 0
}

module.exports = { SOFT_DELETABLE, ACTIVE_WHERE, softDelete, findActive, listActive, anonymizeUser }