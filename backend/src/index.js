require('dotenv').config()
const app = require('./app')
const { startPurgeJob } = require('./jobs/purgeExpired')
const { closeDb } = require('./db')

const PORT = process.env.PORT || 5000

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  startPurgeJob()
})

// Arrêt propre : on laisse les requêtes en cours se terminer puis on ferme
// proprement le client Prisma (libère le pool de connexions).
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\n[server] ${signal} reçu, arrêt en cours...`)
    server.close(async () => {
      await closeDb()
      process.exit(0)
    })
  })
}
