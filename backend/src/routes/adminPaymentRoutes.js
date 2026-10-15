const { Router } = require('express')
const { authenticate, requireRole } = require('../middleware/auth')
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin')
const { ROLES } = require('../roles')
const { getStripe } = require('../services/stripeClient')

// GET /api/admin/payments/balance — solde Stripe disponible / en attente.
// Réservé au super administrateur. En cas d'erreur Stripe (ou clé absente), on
// répond 200 avec `available: null` : la page admin affiche « Unavailable »
// sans casser.
async function getBalance(req, res) {
  const stripe = getStripe()
  if (!stripe) {
    return res.json({ available: null, pending: null, currency: 'GBP', available_in: false })
  }
  try {
    const balance = await stripe.balance.retrieve()
    const gbp = balance.available?.find((entry) => entry.currency === 'gbp')
    const gbpPending = balance.pending?.find((entry) => entry.currency === 'gbp')
    return res.json({
      available: gbp ? gbp.amount / 100 : 0,
      pending: gbpPending ? gbpPending.amount / 100 : 0,
      currency: 'GBP',
      available_in: true,
    })
  } catch (err) {
    console.error('[admin] stripe.balance.retrieve a échoué :', err.message)
    return res.json({ available: null, pending: null, currency: 'GBP', available_in: false })
  }
}

const router = Router()

router.use(authenticate)
router.use(requireRole(ROLES.ADMIN))
router.get('/balance', requireSuperAdmin, getBalance)

module.exports = router
