const { Router } = require('express')
const { query } = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { ROLES } = require('../roles')

const CLIENT_ROLE = "(SELECT id FROM roles WHERE name = 'client')"

async function getSummary(req, res) {
  const { rows } = await query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::float8 AS "totalRevenue",
       COALESCE(SUM(amount) FILTER (WHERE status = 'paid'
         AND created_at >= date_trunc('month', now())), 0)::float8 AS "revenueThisMonth",
       COUNT(*) FILTER (WHERE status = 'paid'
         AND created_at >= date_trunc('month', now())) AS "ordersThisMonth",
       (SELECT COUNT(*) FROM users
         WHERE role_id = ${CLIENT_ROLE}
           AND created_at >= date_trunc('month', now())
           AND deleted_at IS NULL) AS "newClientsThisMonth",
       (SELECT COUNT(*) FROM vehicles
         WHERE deleted_at IS NULL) AS "activeVehiclesCount",
       (SELECT COUNT(*) FROM reviews
         WHERE status = 'pending' AND deleted_at IS NULL) AS "pendingReviewsCount"
     FROM orders`,
  )
  res.json(rows[0])
}

async function getRevenueByMonth(req, res) {
  const { rows } = await query(
    `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS "month",
            COALESCE(SUM(amount), 0)::float8 AS "revenue"
       FROM orders
      WHERE status = 'paid' AND created_at >= date_trunc('month', now() - interval '11 months')
      GROUP BY 1
      ORDER BY 1`,
  )
  const byMonth = new Map(rows.map((r) => [r.month, r.revenue]))
  const months = []
  const now = new Date()
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({ month: key, revenue: byMonth.get(key) ?? 0 })
  }
  res.json({ months })
}

async function getOrdersByDrivetrain(req, res) {
  const { rows } = await query(
    `SELECT v.drivetrain, COUNT(*)::int AS "count"
       FROM orders o
       JOIN vehicles v ON v.id = o.vehicle_id
      WHERE o.status = 'paid'
      GROUP BY v.drivetrain
      ORDER BY "count" DESC`,
  )
  res.json({ rows })
}

async function getRecentActivity(req, res) {
  const [orders, clients] = await Promise.all([
    query(
      `SELECT o.id, u.email AS "email", o.amount::float8 AS "amount",
              o.created_at AS "date"
         FROM orders o
         JOIN users u ON u.id = o.user_id
        WHERE o.status = 'paid'
        ORDER BY o.created_at DESC
        LIMIT 5`,
    ),
    query(
      `SELECT id, email, created_at AS "date"
         FROM users
        WHERE role_id = ${CLIENT_ROLE} AND is_active = TRUE AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 5`,
    ),
  ])

  const activity = [
    ...orders.rows.map((o) => ({
      type: 'order',
      date: o.date,
      label: `Commande payée — ${o.email} (${o.amount} GBP)`,
    })),
    ...clients.rows.map((u) => ({
      type: 'client',
      date: u.date,
      label: `Nouveau client confirmé — ${u.email}`,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)

  res.json({ activity })
}

const router = Router()

router.use(authenticate)
router.use(requireRole(ROLES.ADMIN))

router.get('/summary', getSummary)
router.get('/revenue-by-month', getRevenueByMonth)
router.get('/orders-by-drivetrain', getOrdersByDrivetrain)
router.get('/recent-activity', getRecentActivity)

module.exports = router