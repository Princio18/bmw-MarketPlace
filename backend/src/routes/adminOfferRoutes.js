const { Router } = require('express')
const { authenticate, requireRole } = require('../middleware/auth')
const { checkPermission } = require('../middleware/checkPermission')
const { ROLES } = require('../roles')
const controller = require('../controllers/adminOffersController')

const router = Router()

router.use(authenticate)
router.use(requireRole(ROLES.ADMIN))

const canManageOrders = checkPermission('can_manage_orders')

router.post('/:id/resend', canManageOrders, controller.resendOffer)
router.post('/:id/withdraw', canManageOrders, controller.withdrawOffer)

module.exports = router
