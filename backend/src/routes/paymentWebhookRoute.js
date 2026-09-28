const express = require('express')
const { Router } = require('express')
const paymentService = require('../services/paymentService')

// Route PUBLIQUE appelée par Stripe : jamais d'authentification ici.
// Le corps doit être reçu BRUT (express.raw) pour vérifier la signature.
// Ce routeur est monté AVANT app.use(express.json()) dans index.js.
const router = Router()

router.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    let event
    try {
      event = paymentService.verifyWebhookSignature(
        req.body,
        req.headers['stripe-signature'],
      )
    } catch (err) {
      console.error('[webhook] signature invalide:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    try {
      if (event.type === 'checkout.session.completed') {
        await paymentService.handleCheckoutCompleted(event.data.object)
      }
      if (event.type === 'checkout.session.expired') {
        await paymentService.handleCheckoutExpired(event.data.object)
      }
      if (event.type === 'charge.refunded') {
        // NOTE : l'événement `charge.refunded` doit être activé dans la
        // configuration du webhook Stripe (tableau de bord ou `stripe listen`)
        // sinon il n'est jamais délivré, même si le code le gère ici.
        await paymentService.handleChargeRefunded(event.data.object)
      }
    } catch (err) {
      console.error('[webhook] échec de traitement:', err.message)
      return res.status(500).send('Webhook processing failed')
    }

    return res.json({ received: true })
  },
)

module.exports = router