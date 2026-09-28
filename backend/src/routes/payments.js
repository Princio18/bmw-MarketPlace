const { Router } = require('express')
const { authenticate } = require('../middleware/auth')
const paymentService = require('../services/paymentService')

const router = Router()

router.use(authenticate)

router.post('/create-checkout-session', async (req, res) => {
  try {
    await paymentService.createCheckoutSession(req, res)
  } catch (err) {
    console.error('[payments] échec Stripe:', err.message)
    res.status(500).json({ error: 'Stripe checkout failed' })
  }
})

module.exports = router