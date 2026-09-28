require('dotenv').config()
const { Pool } = require('pg')

function dbConfig() {
  return {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'bmwautosell',
  }
}

const pool = new Pool(dbConfig())

async function query(text, params) {
  return pool.query(text, params)
}

async function closePool() {
  return pool.end()
}

module.exports = { pool, query, closePool, dbConfig }