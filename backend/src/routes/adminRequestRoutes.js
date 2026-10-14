const { Router } = require('express')
const { authenticate, requireRole } = require('../middleware/auth')
const { checkPermission } = require('../middleware/checkPermission')
const { ROLES } = require('../roles')
const controller = require('../controllers/adminRequestsController')
const offersController = require('../controllers/adminOffersController')

const router = Router()

router.use(authenticate)
router.use(requireRole(ROLES.ADMIN))

// Toutes les routes exigent can_manage_orders : les demandes relèvent des
// commandes (pas de 7e permission dédiée).
const canManageOrders = checkPermission('can_manage_orders')

router.get('/', canManageOrders, controller.listRequests)
router.get('/summary', canManageOrders, controller.getSummary)
router.get('/:id', canManageOrders, controller.getRequestDetail)
router.put('/:id/status', canManageOrders, controller.setStatus)
router.put('/:id/notes', canManageOrders, controller.setNotes)
router.post('/:id/messages', canManageOrders, controller.sendMessage)
router.post('/:id/offer-preview', canManageOrders, offersController.offerPreview)
router.post('/:id/offers', canManageOrders, offersController.createOffer)

module.exports = router
