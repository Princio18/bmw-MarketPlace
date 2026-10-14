const { prisma, pgSafe } = require('../db')
const { computeRequestPricing } = require('../services/pricingService')
const { expireStaleOffers } = require('../services/offersService')
const { sendOfferEmailByOfferId } = require('../services/offerEmail')
const { TERMS_VERSION } = require('../terms')

const OFFER_STATUSES = new Set(['active', 'accepted', 'expired', 'withdrawn'])
const DEFAULT_VALID_DAYS = 14

function intOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : null
}

function parseExpiry(value) {
  if (value) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }
  return new Date(Date.now() + DEFAULT_VALID_DAYS * 24 * 60 * 60 * 1000)
}

// Ajustements admin : liste bornée de { label, amount }. Un montant non fini ou
// nul est ignoré (jamais de ligne à 0 qui pollue le décompte).
function sanitizeAdjustments(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 20)
    .map((item) => ({
      label: String(item?.label ?? '').slice(0, 120) || 'Adjustment',
      amount: Number(item?.amount),
    }))
    .filter((item) => Number.isFinite(item.amount) && item.amount !== 0)
}

function mapOffer(row) {
  const safe = pgSafe(row)
  return {
    id: safe.id,
    requestId: safe.request_id ?? safe.requestId,
    vehicleId: safe.vehicle_id ?? safe.vehicleId,
    status: safe.status,
    currency: safe.currency,
    totalAmount: safe.total_amount != null ? Number(safe.total_amount) : safe.totalAmount,
    priceBreakdown: safe.price_breakdown ?? safe.priceBreakdown,
    deliveryWeeksMin: safe.delivery_weeks_min ?? safe.deliveryWeeksMin,
    deliveryWeeksMax: safe.delivery_weeks_max ?? safe.deliveryWeeksMax,
    notes: safe.notes,
    termsVersion: safe.terms_version ?? safe.termsVersion,
    expiresAt: safe.expires_at ?? safe.expiresAt,
    acceptedAt: safe.accepted_at ?? safe.acceptedAt,
    createdAt: safe.created_at ?? safe.createdAt,
  }
}

async function loadRequestWithVehicle(id) {
  const request = await prisma.configuration_requests.findUnique({ where: { id } })
  if (!request) return null
  const vehicle = await prisma.vehicles.findUnique({
    where: { id: request.vehicle_id },
    select: { id: true, model_name: true, variant_label: true, base_price: true, specs: true },
  })
  return { request, vehicle }
}

// POST /api/admin/requests/:id/offer-preview — décompte sans persistance.
async function offerPreview(req, res) {
  const loaded = await loadRequestWithVehicle(req.params.id)
  if (!loaded || !loaded.vehicle) {
    return res.status(404).json({ error: 'Demande introuvable.' })
  }
  const adjustments = sanitizeAdjustments(req.body?.adjustments)

  try {
    const pricing = await computeRequestPricing({
      vehicle: loaded.vehicle,
      configurationData: loaded.request.configuration_data,
      adjustments,
    })
    return res.json({ pricing })
  } catch (err) {
    if (err.code === 'PRICE_REQUIRED') {
      return res
        .status(400)
        .json({ error: 'This vehicle has no price. Set a model price before building an offer.' })
    }
    throw err
  }
}

// POST /api/admin/requests/:id/offers — émet une offre, retire l'active,
// passe la demande à 'offer_sent', puis envoie l'email (awaited).
async function createOffer(req, res) {
  const loaded = await loadRequestWithVehicle(req.params.id)
  if (!loaded || !loaded.vehicle) {
    return res.status(404).json({ error: 'Demande introuvable.' })
  }
  const { request, vehicle } = loaded

  if (request.status === 'converted' || request.status === 'closed') {
    return res
      .status(409)
      .json({ error: 'This request can no longer receive an offer.' })
  }

  const adjustments = sanitizeAdjustments(req.body?.adjustments)
  const deliveryWeeksMin = intOrNull(req.body?.deliveryWeeksMin)
  const deliveryWeeksMax = intOrNull(req.body?.deliveryWeeksMax)
  if (
    deliveryWeeksMin != null &&
    deliveryWeeksMax != null &&
    deliveryWeeksMin > deliveryWeeksMax
  ) {
    return res.status(400).json({ error: 'Delivery range is invalid.' })
  }
  const notes =
    typeof req.body?.notes === 'string' && req.body.notes.trim()
      ? req.body.notes.trim().slice(0, 5000)
      : null
  const expiresAt = parseExpiry(req.body?.expiresAt)

  let pricing
  try {
    pricing = await computeRequestPricing({
      vehicle,
      configurationData: request.configuration_data,
      adjustments,
    })
  } catch (err) {
    if (err.code === 'PRICE_REQUIRED') {
      return res
        .status(400)
        .json({ error: 'This vehicle has no price. Set a model price before building an offer.' })
    }
    throw err
  }

  const [, created] = await prisma.$transaction([
    prisma.offers.updateMany({
      where: { request_id: request.id, status: 'active' },
      data: { status: 'withdrawn', updated_at: new Date() },
    }),
    prisma.offers.create({
      data: {
        request_id: request.id,
        vehicle_id: request.vehicle_id,
        created_by: req.user.id,
        status: 'active',
        currency: pricing.currency,
        total_amount: pricing.total,
        price_breakdown: pricing,
        delivery_weeks_min: deliveryWeeksMin,
        delivery_weeks_max: deliveryWeeksMax,
        notes,
        terms_version: TERMS_VERSION,
        expires_at: expiresAt,
      },
    }),
    prisma.configuration_requests.update({
      where: { id: request.id },
      data: {
        status: 'offer_sent',
        updated_at: new Date(),
        ...(request.handled_by ? {} : { handled_by: req.user.id }),
      },
    }),
  ])

  let emailSent = true
  try {
    await sendOfferEmailByOfferId(created.id)
  } catch (err) {
    emailSent = false
    console.error('[admin-offers] échec envoi email offre :', err.message)
  }

  return res.status(201).json({ offer: mapOffer(created), emailSent })
}

// POST /api/admin/offers/:id/resend — renvoie l'email d'une offre active.
async function resendOffer(req, res) {
  await expireStaleOffers()
  const offer = await prisma.offers.findUnique({ where: { id: req.params.id } })
  if (!offer) {
    return res.status(404).json({ error: 'Offre introuvable.' })
  }
  if (offer.status !== 'active') {
    return res.status(409).json({ error: 'Only an active offer can be resent.' })
  }

  let emailSent = true
  try {
    await sendOfferEmailByOfferId(offer.id)
  } catch (err) {
    emailSent = false
    console.error('[admin-offers] échec renvoi email offre :', err.message)
  }
  return res.json({ emailSent })
}

// POST /api/admin/offers/:id/withdraw — retire une offre active.
async function withdrawOffer(req, res) {
  const result = await prisma.offers.updateMany({
    where: { id: req.params.id, status: 'active' },
    data: { status: 'withdrawn', updated_at: new Date() },
  })
  if (result.count === 0) {
    const exists = await prisma.offers.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    })
    if (!exists) return res.status(404).json({ error: 'Offre introuvable.' })
    return res.status(409).json({ error: 'Only an active offer can be withdrawn.' })
  }
  return res.json({ ok: true })
}

module.exports = {
  offerPreview,
  createOffer,
  resendOffer,
  withdrawOffer,
  OFFER_STATUSES,
}
