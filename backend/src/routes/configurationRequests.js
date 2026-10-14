const { Router } = require('express')
const {
  createConfigurationRequest,
  listMyRequests,
  getConfigurationRequest,
  updateConfigurationRequest,
} = require('../controllers/configurationRequestsController')
const { authenticate } = require('../middleware/auth')

const router = Router()

// Toutes les routes exigent un utilisateur connecté : plus aucun accès anonyme.
router.use(authenticate)

router.post('/', createConfigurationRequest)
router.get('/mine', listMyRequests)
router.get('/:id', getConfigurationRequest)
router.put('/:id', updateConfigurationRequest)

module.exports = router
