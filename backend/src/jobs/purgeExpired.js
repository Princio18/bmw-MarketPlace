const cron = require('node-cron')
const { query } = require('../db')

const RETENTION_DAYS = 90
const CRON_SCHEDULE = '0 3 * * *' // tous les jours à 03:00

async function purgeExpiredRows() {
  const cutoff = `now() - interval '${RETENTION_DAYS} days'`
  const report = []

  const r1 = await query(
    `DELETE FROM carts
      WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff}`,
  )
  report.push(`carts : ${r1.rowCount}`)

  const r2 = await query(
    `DELETE FROM vehicles
      WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff}`,
  )
  report.push(`vehicles : ${r2.rowCount}`)

  const r2fa = await query(
    `DELETE FROM admin_email_otps
      WHERE expires_at < now()`,
  )
  report.push(`admin_email_otps : ${r2fa.rowCount}`)

  const r3 = await query(
    `DELETE FROM users
      WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff}`,
  )
  report.push(`users : ${r3.rowCount}`)

  const rClient = await query(
    `DELETE FROM users
      WHERE role_id = (SELECT id FROM roles WHERE name = 'client')
        AND is_active = FALSE
        AND activation_expires_at IS NOT NULL
        AND activation_expires_at < now()`,
  )
  report.push(`clients_inactifs_expires : ${rClient.rowCount}`)

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