const { Router } = require('express')
const { authenticate, requireRole } = require('../middleware/auth')
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin')
const { ROLES } = require('../roles')
const { prisma } = require('../db')

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// GET /api/admin/audit — journal des actions sensibles. Super administrateur
// uniquement (traçabilité de l'administration par l'administration).
async function listAudit(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 25))

  const where = {}
  if (req.query.admin && UUID_RE.test(String(req.query.admin))) {
    where.admin_id = String(req.query.admin)
  }
  if (req.query.action) {
    where.action = String(req.query.action).slice(0, 60)
  }

  const [total, rows] = await Promise.all([
    prisma.audit_log.count({ where }),
    prisma.audit_log.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        admin: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    }),
  ])

  const entries = rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata,
    createdAt: row.created_at,
    admin: row.admin
      ? {
          id: row.admin.id,
          name: `${row.admin.first_name} ${row.admin.last_name}`.trim(),
          email: row.admin.email,
        }
      : null,
  }))

  return res.json({ entries, total, page, pageSize })
}

const router = Router()

router.use(authenticate)
router.use(requireRole(ROLES.ADMIN))
router.get('/', requireSuperAdmin, listAudit)

module.exports = router
