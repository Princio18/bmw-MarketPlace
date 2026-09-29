// Utilitaire de développement : exécute un SQL libre via Prisma.
// Usage : node scripts/_sql.js "SELECT count(*) FROM vehicles"
require('dotenv').config()

const { closeDb, prisma } = require('../src/db')

const sql = process.argv[2]

if (!sql) {
  console.error('Usage : node scripts/_sql.js "<requête SQL>"')
  process.exit(1)
}

prisma
  .$queryRawUnsafe(sql)
  .then(async (rows) => {
    console.log('OK rows:', rows.length)
    console.log(rows)
    await closeDb()
  })
  .catch(async (e) => {
    console.error(e.message)
    await closeDb()
    process.exit(1)
  })
