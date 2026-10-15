const { Router } = require('express')
const {
  createConfigurationRequest,
  listMyRequests,
  getConfigurationRequest,
  updateConfigurationRequest,
} = require('../controllers/configurationRequestsController')
const { authenticate } = require('../middleware/auth')
const { dbRateLimit } = require('../middleware/dbRateLimit')

const router = Router()

// Toutes les routes exigent un utilisateur connecté : plus aucun accès anonyme.
router.use(authenticate)

// 10 demandes de configuration / heure et par utilisateur.
const createRequestLimiter = dbRateLimit({
  name: 'config-request',
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyFn: (req) => req.user.id,
})

router.post('/', createRequestLimiter, createConfigurationRequest)
router.get('/mine', listMyRequests)
router.get('/:id', getConfigurationRequest)
router.put('/:id', updateConfigurationRequest)

module.exports = router
