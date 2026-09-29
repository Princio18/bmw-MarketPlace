const { Router } = require('express')
const rateLimit = require('express-rate-limit')
const { usersRepo } = require('../repositories/users')
const { authenticate, requireRole } = require('../middleware/auth')
const { ROLES } = require('../roles')
const { createAdminUser } = require('../services/adminService')
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin')
const { isValidEmail, validatePassword } = require('../auth/validation')
const { prisma } = require('../db')

const router = Router()

router.use(authenticate)
router.use(requireRole(ROLES.ADMIN))

router.get('/users', async (req, res, next) => {
  try {
    const role = req.query.role
    const users = await usersRepo.listUsers(100, role)
    res.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
        created_at: u.created_at,
        is_two_factor_enabled: u.is_two_factor_enabled,
      })),
    })
  } catch (err) {
    next(err)
  }
})

// 10 créations / heure par admin authentifié
const createAdminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => (req.user ? req.user.id : 'anon'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez plus tard.' },
})

router.post('/create-admin', requireSuperAdmin, createAdminLimiter, async (req, res, next) => {
  try {
    const { email = '', password = '', first_name: firstName = '', last_name: lastName = '' } =
      req.body || {}

    if (!String(firstName).trim() || !String(lastName).trim()) {
      return res.status(400).json({ error: 'Prénom et nom obligatoires.' })
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Adresse email invalide.' })
    }
    if (!validatePassword(password)) {
      return res.status(400).json({
        error:
          'Mot de passe invalide : 10 à 40 caractères, une minuscule, une majuscule, un chiffre et un caractère spécial.',
      })
    }

    const { created, user } = await createAdminUser({
      email,
      password,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      isSuperAdmin: false,
    })
    if (!created) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }

    await prisma.admin_permissions.upsert({
      where: { user_id: req.user.id },
      create: { user_id: req.user.id },
      update: {},
    })

    console.log(`[admin] Nouvel admin créé par ${req.user.id} : ${user.email}`)
    return res.status(201).json({ id: user.id, email: user.email, role: user.role })
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }
    return next(err)
  }
})

module.exports = router