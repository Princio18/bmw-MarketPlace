const { Router } = require('express')
const { prisma } = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { ROLES } = require('../roles')

async function listNotifications(req, res) {
  const unreadOnly = req.query.unreadOnly === 'true'
  const where = unreadOnly ? { is_read: false } : {}
  const rows = await prisma.admin_notifications.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: 20,
    select: {
      id: true,
      type: true,
      message: true,
      related_id: true,
      is_read: true,
      created_at: true,
    },
  })
  const notifications = rows.map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    relatedId: n.related_id,
    isRead: n.is_read,
    createdAt: n.created_at,
  }))
  res.json({ notifications })
}

async function markRead(req, res) {
  const result = await prisma.admin_notifications.updateMany({
    where: { id: req.params.id },
    data: { is_read: true },
  })
  if (result.count === 0) {
    return res.status(404).json({ error: 'Notification introuvable.' })
  }
  return res.json({ ok: true })
}

async function markAllRead(req, res) {
  await prisma.admin_notifications.updateMany({
    where: { is_read: false },
    data: { is_read: true },
  })
  return res.json({ ok: true })
}

const router = Router()

router.use(authenticate)
router.use(requireRole(ROLES.ADMIN))

router.get('/', listNotifications)
router.post('/read-all', markAllRead)
router.post('/:id/read', markRead)

module.exports = router
