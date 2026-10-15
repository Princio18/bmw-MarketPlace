const { prisma, pgSafe } = require('../db')
const { stripe } = require('../services/stripeClient')
const accessoryService = require('../services/accessoryService')
const { expireStaleOffers } = require('../services/offersService')
const { TERMS_VERSION } = require('../terms')

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
// Base absolue des images produit pour Stripe. Sur Vercel, FRONTEND_URL ne
// suffit pas : Stripe doit pouvoir charger l'image côté serveur, on privilégie
// donc BACKEND_URL, sinon l'URL de la requête courante.
const BACKEND_URL = process.env.BACKEND_URL || ''

const penceFromAmount = (amount) => Math.round(Number(amount) * 100)

// Construit les lignes Stripe depuis le décompte figé de l'offre (TTC). Les
// lignes positives deviennent des lignes de commande ; les ajustements négatifs
// sont regroupés en un coupon de remise (Stripe n'accepte pas de ligne
// négative). On NE rajoute PAS de ligne TVA : les prix sont TTC, la TVA est
// déjà incluse dans chaque montant.
function buildStripeLineItems(offer, order, dealerName, imageBaseUrl) {
  const currency = (offer.currency || 'GBP').toLowerCase()
  const breakdown = offer.price_breakdown || {}
  const lines = Array.isArray(breakdown.lines) ? breakdown.lines : []
  const counted = lines.filter((line) => line.counted !== false)

  const lineItems = []
  let discountPence = 0
  let positivePence = 0

  for (const line of counted) {
    const unitAmount = penceFromAmount(line.amount)
    if (unitAmount > 0) {
      const isVehicle = line.kind === 'vehicle'
      const productData = {
        name: isVehicle
          ? `BMW ${offer.modelName}${offer.variantLabel ? ` ${offer.variantLabel}` : ''}`.trim()
          : String(line.label || 'Item'),
      }
      if (isVehicle) {
        const ref = `#${String(order.id).slice(0, 8).toUpperCase()}`
        productData.description = `Order ${ref} — handover at ${
          dealerName || 'to be confirmed'
        }`
        if (imageBaseUrl) {
          productData.images = [
            `${imageBaseUrl}/api/vehicles/${offer.vehicle_id}/image`,
          ]
        }
      }
      lineItems.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: unitAmount,
          product_data: productData,
        },
      })
      positivePence += unitAmount
    } else if (unitAmount < 0) {
      discountPence += Math.abs(unitAmount)
    }
  }

  // Garde-fou : jamais de session Stripe sans ligne.
  if (lineItems.length === 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: Math.max(0, Math.round(Number(offer.total_amount) * 100)),
        product_data: {
          name: `BMW ${offer.modelName}${offer.variantLabel ? ` ${offer.variantLabel}` : ''}`.trim(),
        },
      },
    })
  }

  return { lineItems, discountPence, positivePence, currency }
}

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
       r.preferred_dealer_id AS "preferredDealerId",
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
      // Version des conditions acceptées (traçabilité juridique).
      terms_version: TERMS_VERSION,
      // Centre de remise préféré saisi par le client sur la demande ; point de
      // départ du suivi post-paiement (modifiable ensuite par un admin).
      handover_dealer_id: offer.preferredDealerId || null,
    },
    select: { id: true },
  })

  // Nom du centre de remise affiché sur la ligne Stripe (facultatif).
  let dealerName = null
  if (offer.preferredDealerId) {
    const dealer = await prisma.dealers.findUnique({
      where: { id: offer.preferredDealerId },
      select: { name: true },
    })
    dealerName = dealer?.name || null
  }

  const imageBaseUrl =
    BACKEND_URL || `${req.protocol}://${req.get('host')}`

  const { lineItems, discountPence, positivePence, currency } =
    buildStripeLineItems(offer, order, dealerName, imageBaseUrl)

  // Garde-fou : le total Stripe doit correspondre au penny près au montant de la
  // commande. Sinon on expire la commande (évite une session incohérente).
  const expectedPence = Math.round(amount * 100)
  if (positivePence - discountPence !== expectedPence) {
    console.error(
      `[checkout] décalage de prix offre ${offer.id} : lignes ${positivePence} - remise ${discountPence} ≠ attendu ${expectedPence}`,
    )
    await prisma.orders.update({
      where: { id: order.id },
      data: { status: 'expired' },
    })
    return res.status(500).json({ error: 'Pricing mismatch.' })
  }

  // Ajustements négatifs -> coupon (Stripe n'accepte pas de montant négatif).
  let discounts
  if (discountPence > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: discountPence,
      currency,
      duration: 'once',
      name: 'Discount',
    })
    discounts = [{ coupon: coupon.id }]
  }

  const sessionParams = {
    mode: 'payment',
    submit_type: 'pay',
    // Sans payment_method_types : Stripe applique les moyens de paiement
    // activés dans le tableau de bord.
    line_items: lineItems,
    customer_email: req.user.email,
    client_reference_id: order.id,
    billing_address_collection: 'required',
    allow_promotion_codes: false,
    ...(discounts ? { discounts } : {}),
    custom_text: {
      submit: { message: `Payment for your BMW ${offer.modelName}.` },
    },
    payment_intent_data: {
      description: `BMW ${offer.modelName} — order #${String(order.id).slice(0, 8).toUpperCase()}`,
      metadata: { orderId: order.id, offerId: offer.id },
    },
    metadata: { orderId: order.id, offerId: offer.id },
    success_url: `${FRONTEND_URL}/order-confirmation?session_id={CHECKOUT_SESSION_ID}&order=${order.id}`,
    cancel_url: `${FRONTEND_URL}/offers/${offer.id}`,
  }

  let session
  try {
    session = await stripe.checkout.sessions.create({
      ...sessionParams,
      adaptive_pricing: { enabled: false },
    })
  } catch (err) {
    // `adaptive_pricing` n'existe pas dans toutes les versions d'API Stripe :
    // on réessaie sans ce paramètre plutôt que de faire échouer le paiement.
    if (/adaptive_pricing/i.test(String(err?.message || ''))) {
      session = await stripe.checkout.sessions.create(sessionParams)
    } else {
      throw err
    }
  }

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
