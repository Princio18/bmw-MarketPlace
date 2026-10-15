const { Router } = require('express')
const { authenticate } = require('../middleware/auth')
const { dbRateLimit } = require('../middleware/dbRateLimit')
const controller = require('../controllers/offersController')

const router = Router()

// 20 tentatives de paiement / heure et par utilisateur.
const checkoutLimiter = dbRateLimit({
  name: 'checkout',
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyFn: (req) => req.user.id,
})

router.get('/:id', authenticate, controller.getOffer)
router.post('/:id/checkout', authenticate, checkoutLimiter, controller.checkoutOffer)

module.exports = router
