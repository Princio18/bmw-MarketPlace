const { Router } = require('express')
const { authenticate } = require('../middleware/auth')
const controller = require('../controllers/offersController')

const router = Router()

router.get('/:id', authenticate, controller.getOffer)
router.post('/:id/checkout', authenticate, controller.checkoutOffer)

module.exports = router
