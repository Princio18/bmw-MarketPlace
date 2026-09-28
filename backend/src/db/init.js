require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { dbConfig } = require('../db')

const DB_NAME = process.env.PGDATABASE || 'bmwautosell'

async function main() {
  const admin = new Client({ ...dbConfig(), database: 'postgres' })
  await admin.connect()
  const { rowCount } = await admin.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [DB_NAME],
  )
  if (rowCount === 0) {
    await admin.query(`CREATE DATABASE "${DB_NAME}"`)
    console.log(`Base "${DB_NAME}" créée.`)
  } else {
    console.log(`Base "${DB_NAME}" déjà présente.`)
  }
  await admin.end()

  const db = new Client({ ...dbConfig(), database: DB_NAME })
  try {
    await db.connect()
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
    await db.query(schema)
    console.log('Schéma appliqué (roles, users, vehicles, carts, favorites, orders, order_items).')
  } finally {
    await db.end()
  }
}

main().catch((err) => {
  console.error('db:init — échec :', err.message)
  process.exit(1)
})