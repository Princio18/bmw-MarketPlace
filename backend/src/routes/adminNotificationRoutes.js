const { Router } = require('express')
const { query } = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { ROLES } = require('../roles')

async function listNotifications(req, res) {
  const unreadOnly = req.query.unreadOnly === 'true'
  const { rows } = await query(
    `SELECT id, type, message, related_id AS "relatedId", is_read AS "isRead", created_at AS "createdAt"
       FROM admin_notifications
      ${unreadOnly ? 'WHERE is_read = FALSE' : ''}
      ORDER BY created_at DESC
      LIMIT 20`,
  )
  res.json({ notifications: rows })
}

async function markRead(req, res) {
  const { rowCount } = await query(
    'UPDATE admin_notifications SET is_read = TRUE WHERE id = $1',
    [req.params.id],
  )
  if (rowCount === 0) {
    return res.status(404).json({ error: 'Notification introuvable.' })
  }
  return res.json({ ok: true })
}

async function markAllRead(req, res) {
  await query('UPDATE admin_notifications SET is_read = TRUE WHERE is_read = FALSE')
  return res.json({ ok: true })
}

const router = Router()

router.use(authenticate)
router.use(requireRole(ROLES.ADMIN))

router.get('/', listNotifications)
router.post('/read-all', markAllRead)
router.post('/:id/read', markRead)

module.exports = router