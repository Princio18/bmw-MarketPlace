const { prisma, pgSafe } = require('../db')
const { stripe } = require('../services/stripeClient')
const accessoryService = require('../services/accessoryService')
const { expireStaleOffers } = require('../services/offersService')
const { TERMS_VERSION } = require('../terms')

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

function mapPublicOffer(row) {
  const safe = pgSafe(row)
  return {
    id: safe.id,
    status: safe.status,
    currency: safe.currency,
    totalAmount: safe.total_amount != null ? Number(safe.total_amount) : safe.totalAmount,
    priceBreakdown: safe.price_breakdown ?? safe.priceBreakdown,
    deliveryWeeksMin: safe.delivery_weeks_min ?? safe.deliveryWeeksMin,
    deliveryWeeksMax: safe.delivery_weeks_max ?? safe.deliveryWeeksMax,
    notes: safe.notes,
    expiresAt: safe.expires_at ?? safe.expiresAt,
    acceptedAt: safe.accepted_at ?? safe.acceptedAt,
    vehicle: {
      id: safe.vehicle_id ?? safe.vehicleId,
      modelName: safe.model_name ?? safe.modelName,
      variantLabel: safe.variant_label ?? safe.variantLabel,
      imageUpdatedAt: safe.image_updated_at ?? safe.imageUpdatedAt,
    },
  }
}

// Charge une offre en s'assurant qu'elle appartient bien à l'utilisateur courant
// (via user_id de la demande, ou à défaut l'email — les demandes invité ont un
// user_id NULL mais un email). Retourne `{ offer, request }` ou null.
async function loadOwnedOffer(id, user) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       o.*,
       r.user_id AS "requestUserId",
       r.email AS "requestEmail",
       r.configuration_data AS "configurationData",
       v.model_name AS "modelName",
       v.variant_label AS "variantLabel",
       v.image_updated_at AS "imageUpdatedAt"
     FROM offers o
     JOIN configuration_requests r ON r.id = o.request_id
     JOIN vehicles v ON v.id = o.vehicle_id
     WHERE o.id = $1`,
    id,
  )
  const offer = rows[0]
  if (!offer) return null
  const ownsById = offer.requestUserId && offer.requestUserId === user.id
  const ownsByEmail =
    offer.requestEmail && String(offer.requestEmail).toLowerCase() === String(user.email || '').toLowerCase()
  if (!ownsById && !ownsByEmail) return null
  return offer
}

// GET /api/offers/:id — détail d'une offre pour son destinataire.
async function getOffer(req, res) {
  await expireStaleOffers()
  const offer = await loadOwnedOffer(req.params.id, req.user)
  if (!offer) {
    return res.status(404).json({ error: 'Offre introuvable.' })
  }
  return res.json({ offer: mapPublicOffer(offer) })
}

// POST /api/offers/:id/checkout — acceptation + session Stripe.
async function checkoutOffer(req, res) {
  if (!stripe) {
    return res
      .status(500)
      .json({ error: 'Le paiement n’est pas configuré (STRIPE_SECRET_KEY manquant).' })
  }
  if (req.body?.acceptTerms !== true) {
    return res.status(400).json({ error: 'Vous devez accepter les conditions.' })
  }

  await expireStaleOffers()
  const offer = await loadOwnedOffer(req.params.id, req.user)
  if (!offer) {
    return res.status(404).json({ error: 'Offre introuvable.' })
  }
  if (offer.status !== 'active') {
    return res.status(409).json({ error: 'Cette offre n’est plus disponible.' })
  }

  // Les accessoires sont RECHARGÉS depuis la base : ids seuls côté client.
  // Un accessoire retiré ou en rupture invalide la commande.
  const accessoryIds = offer.configurationData?.accessoryIds
  const { items, missing } = await accessoryService.resolveAccessories(accessoryIds)
  const outOfStock = items.filter((item) => !item.inStock)
  const unassigned = await accessoryService.findUnassignedAccessoryIds(
    offer.vehicle_id,
    accessoryIds,
  )
  if (missing.length > 0 || outOfStock.length > 0 || unassigned.length > 0) {
    return res
      .status(409)
      .json({ error: 'Un accessoire sélectionné n’est plus disponible. Contactez notre équipe.' })
  }

  const amount = Number(offer.total_amount)

  const order = await prisma.orders.create({
    data: {
      user_id: req.user.id,
      vehicle_id: offer.vehicle_id,
      offer_id: offer.id,
      amount,
      currency: offer.currency || 'GBP',
      status: 'pending',
      price_breakdown: offer.price_breakdown,
    },
    select: { id: true },
  })

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: (offer.currency || 'GBP').toLowerCase(),
          product_data: { name: `BMW ${offer.modelName} — offer` },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${FRONTEND_URL}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/offers/${offer.id}`,
    metadata: { orderId: order.id, offerId: offer.id },
  })

  await prisma.orders.update({
    where: { id: order.id },
    data: { stripe_checkout_session_id: session.id },
  })
  await prisma.offers.update({
    where: { id: offer.id },
    data: { stripe_checkout_session_id: session.id, updated_at: new Date() },
  })

  return res.json({ url: session.url })
}

module.exports = { getOffer, checkoutOffer, TERMS_VERSION }
