const cron = require('node-cron')
const { prisma } = require('../db')

const RETENTION_DAYS = 90
const CRON_SCHEDULE = '0 3 * * *' // tous les jours à 03:00

async function purgeExpiredRows() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const report = []

  const r1 = await prisma.carts.deleteMany({
    where: { deleted_at: { not: null, lt: cutoff } },
  })
  report.push(`carts : ${r1.count}`)

  const r2 = await prisma.vehicles.deleteMany({
    where: { deleted_at: { not: null, lt: cutoff } },
  })
  report.push(`vehicles : ${r2.count}`)

  const r2fa = await prisma.admin_email_otps.deleteMany({
    where: { expires_at: { lt: new Date() } },
  })
  report.push(`admin_email_otps : ${r2fa.count}`)

  const r3 = await prisma.users.deleteMany({
    where: { deleted_at: { not: null, lt: cutoff } },
  })
  report.push(`users : ${r3.count}`)

  const rClient = await prisma.users.deleteMany({
    where: {
      role: { name: 'client' },
      is_active: false,
      activation_expires_at: { not: null, lt: new Date() },
    },
  })
  report.push(`clients_inactifs_expires : ${rClient.count}`)

  console.log(`[purge] ${new Date().toISOString()} — ${report.join(', ')}`)
  return report
}

function startPurgeJob() {
  if (process.env.CRON_ENABLED === 'false') {
    console.log('[purge] routine désactivée (CRON_ENABLED=false)')
    return
  }
  cron.schedule(
    CRON_SCHEDULE,
    () => {
      purgeExpiredRows().catch((err) =>
        console.error('[purge] échec :', err.message),
      )
    },
    { scheduled: true },
  )
  console.log(
    `[purge] routine programmée : quotidien à 03:00 (rétention ${RETENTION_DAYS} j)`,
  )
}

module.exports = { purgeExpiredRows, startPurgeJob, RETENTION_DAYS }