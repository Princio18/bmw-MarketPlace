const { Router } = require('express')
const { query } = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin')
const { ROLES } = require('../roles')

const ADMIN_ROLE = "(SELECT id FROM roles WHERE name = 'admin')"

const PERMISSION_COLUMNS = [
  'can_manage_vehicles',
  'can_manage_orders',
  'can_process_refunds',
  'can_manage_reviews',
  'can_view_reports',
  'can_manage_clients',
]

const PERMISSION_DEFAULTS = {
  can_manage_vehicles: true,
  can_manage_orders: true,
  can_process_refunds: false,
  can_manage_reviews: true,
  can_view_reports: false,
  can_manage_clients: true,
}

async function listTeam(req, res) {
  const { rows } = await query(
    `SELECT
       u.id,
       u.email,
       u.first_name AS "firstName",
       u.last_name AS "lastName",
       u.is_super_admin AS "isSuperAdmin",
       COALESCE(ap.can_manage_vehicles, $1) AS "can_manage_vehicles",
       COALESCE(ap.can_manage_orders, $2) AS "can_manage_orders",
       COALESCE(ap.can_process_refunds, $3) AS "can_process_refunds",
       COALESCE(ap.can_manage_reviews, $4) AS "can_manage_reviews",
       COALESCE(ap.can_view_reports, $5) AS "can_view_reports",
       COALESCE(ap.can_manage_clients, $6) AS "can_manage_clients"
     FROM users u
     LEFT JOIN admin_permissions ap ON ap.user_id = u.id
     WHERE u.role_id = ${ADMIN_ROLE} AND u.deleted_at IS NULL
     ORDER BY u.is_super_admin DESC, u.created_at ASC`,
    [
      PERMISSION_DEFAULTS.can_manage_vehicles,
      PERMISSION_DEFAULTS.can_manage_orders,
      PERMISSION_DEFAULTS.can_process_refunds,
      PERMISSION_DEFAULTS.can_manage_reviews,
      PERMISSION_DEFAULTS.can_view_reports,
      PERMISSION_DEFAULTS.can_manage_clients,
    ],
  )
  res.json({ team: rows })
}

async function findAdmin(userId) {
  const { rows } = await query(
    `SELECT u.id, u.is_super_admin AS "isSuperAdmin"
       FROM users u
      WHERE u.id = $1 AND u.role_id = ${ADMIN_ROLE} AND u.deleted_at IS NULL`,
    [userId],
  )
  return rows[0] || null
}

async function updatePermissions(req, res) {
  const target = await findAdmin(req.params.userId)
  if (!target) {
    return res.status(404).json({ error: 'Administrateur introuvable.' })
  }
  if (target.isSuperAdmin) {
    return res.status(400).json({ error: 'Impossible de modifier un Super Admin.' })
  }

  const body = req.body || {}
  const values = {}
  for (const col of PERMISSION_COLUMNS) {
    if (typeof body[col] !== 'boolean') {
      return res.status(400).json({ error: `Permission invalide : ${col}` })
    }
    values[col] = body[col]
  }
  if (values.can_manage_vehicles === false &&
      values.can_manage_orders === false &&
      values.can_process_refunds === false &&
      values.can_manage_reviews === false &&
      values.can_view_reports === false &&
      values.can_manage_clients === false) {
    return res.status(400).json({ error: 'Au moins une permission doit rester active.' })
  }

  await query(
    `INSERT INTO admin_permissions (user_id, can_manage_vehicles, can_manage_orders,
                                    can_process_refunds, can_manage_reviews,
                                    can_view_reports, can_manage_clients, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (user_id) DO UPDATE SET
       can_manage_vehicles = EXCLUDED.can_manage_vehicles,
       can_manage_orders = EXCLUDED.can_manage_orders,
       can_process_refunds = EXCLUDED.can_process_refunds,
       can_manage_reviews = EXCLUDED.can_manage_reviews,
       can_view_reports = EXCLUDED.can_view_reports,
       can_manage_clients = EXCLUDED.can_manage_clients,
       updated_at = now()`,
    [
      target.id,
      values.can_manage_vehicles,
      values.can_manage_orders,
      values.can_process_refunds,
      values.can_manage_reviews,
      values.can_view_reports,
      values.can_manage_clients,
    ],
  )
  res.json({ ok: true })
}

async function promoteUser(req, res) {
  const target = await findAdmin(req.params.userId)
  if (!target) {
    return res.status(404).json({ error: 'Administrateur introuvable.' })
  }
  if (target.isSuperAdmin) {
    return res.status(400).json({ error: 'Cet utilisateur est déjà un Super Admin.' })
  }

  await query(
    'UPDATE users SET is_super_admin = TRUE, updated_at = NOW() WHERE id = $1',
    [target.id],
  )
  await query('DELETE FROM admin_permissions WHERE user_id = $1', [target.id])
  res.json({ ok: true })
}

const router = Router()

router.use(authenticate)
router.use(requireRole(ROLES.ADMIN))
router.use(requireSuperAdmin)

router.get('/', listTeam)
router.put('/:userId/permissions', updatePermissions)
router.put('/:userId/promote', promoteUser)

module.exports = router