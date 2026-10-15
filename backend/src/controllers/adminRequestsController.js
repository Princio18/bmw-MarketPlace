const { prisma, pgSafe } = require('../db')
const { requestRef } = require('../utils/requestRef')
const accessoryService = require('../services/accessoryService')
const { sendAdminMessageEmail } = require('../services/adminMessageEmail')
const { logRequestMessage } = require('../services/requestMessages')
const { logAudit } = require('../services/auditLog')
const { expireStaleOffers } = require('../services/offersService')

const REQUEST_STATUSES = new Set([
  'new',
  'contacted',
  'offer_sent',
  'converted',
  'closed',
])

// Statuts que l'admin peut fixer à la main : 'offer_sent' et 'converted' sont
// posés automatiquement par le système (émission d'offre / paiement).
const MANUAL_STATUSES = new Set(['new', 'contacted', 'closed'])

const SUBJECT_MAX = 150
const BODY_MAX = 5000
const NOTES_MAX = 20000

function asObject(value) {
  if (value && typeof value === 'object') return value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function vehicleImage(vehicleId, updatedAt) {
  const v = updatedAt ? new Date(updatedAt).getTime() : 0
  return `/api/vehicles/${vehicleId}/image?v=${v}`
}

// GET /api/admin/requests — liste paginée, filtrable par statut et recherche.
async function listRequests(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
  const offset = (page - 1) * pageSize

  const status = REQUEST_STATUSES.has(req.query.status) ? req.query.status : null
  const qRaw = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const q = qRaw ? `%${qRaw}%` : null

  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       r.id,
       r.created_at AS "createdAt",
       r.status,
       r.contact_preference AS "contactPreference",
       r.phone_country_code AS "phoneCountryCode",
       r.phone_number AS "phoneNumber",
       r.first_name AS "firstName",
       r.last_name AS "lastName",
       r.email,
       v.model_name AS "modelName",
       v.variant_label AS "variantLabel",
       d.name AS "dealerName",
       d.city AS "dealerCity"
     FROM configuration_requests r
     JOIN vehicles v ON v.id = r.vehicle_id
     LEFT JOIN dealers d ON d.id = r.preferred_dealer_id
     WHERE ($1::text IS NULL OR r.status = $1)
       AND (
         $2::text IS NULL
         OR r.email ILIKE $2
         OR (COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '')) ILIKE $2
       )
     ORDER BY r.created_at DESC
     LIMIT $3 OFFSET $4`,
    status,
    q,
    pageSize,
    offset,
  )

  const requests = pgSafe(rows).map((row) => ({ ...row, ref: requestRef(row.id) }))
  return res.json({ requests, page, pageSize })
}

// GET /api/admin/requests/summary — compteur de demandes non traitées.
async function getSummary(req, res) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS "newCount"
       FROM configuration_requests
      WHERE status = 'new'`,
  )
  return res.json(pgSafe(rows[0]))
}

// GET /api/admin/requests/:id — détail complet pour la fiche admin.
// `admin_notes` n'apparaît QUE sur cette route admin, jamais côté client.
async function getRequestDetail(req, res) {
  const request = await prisma.configuration_requests.findUnique({
    where: { id: req.params.id },
  })
  if (!request) {
    return res.status(404).json({ error: 'Demande introuvable.' })
  }

  const [vehicle, dealer, messages] = await Promise.all([
    prisma.vehicles.findUnique({
      where: { id: request.vehicle_id },
      select: {
        id: true,
        model_name: true,
        variant_label: true,
        base_price: true,
        specs: true,
        image_updated_at: true,
      },
    }),
    request.preferred_dealer_id
      ? prisma.dealers.findUnique({
          where: { id: request.preferred_dealer_id },
          select: { id: true, name: true, city: true },
        })
      : Promise.resolve(null),
    prisma.request_messages.findMany({
      where: { request_id: request.id },
      orderBy: { created_at: 'asc' },
    }),
  ])

  const configurationData = asObject(request.configuration_data)
  const accessoryIds = Array.isArray(configurationData.accessoryIds)
    ? configurationData.accessoryIds
    : []
  const { items } = await accessoryService.resolveAccessories(accessoryIds)
  const accessories = items.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
  }))

  // Les offres de la demande (table créée en migration 8) : toléré si la table
  // n'existe pas encore (déploiement partiel), on retombe alors sur une liste vide.
  let offers = []
  try {
    await expireStaleOffers()
    const offerRows = await prisma.$queryRawUnsafe(
      `SELECT id, status, total_amount::float8 AS "totalAmount", currency,
              delivery_weeks_min AS "deliveryWeeksMin",
              delivery_weeks_max AS "deliveryWeeksMax",
              expires_at AS "expiresAt", created_at AS "createdAt"
         FROM offers
        WHERE request_id = $1
        ORDER BY created_at DESC`,
      request.id,
    )
    offers = pgSafe(offerRows)
  } catch {
    offers = []
  }

  const safe = pgSafe({
    id: request.id,
    vehicleId: request.vehicle_id,
    configurationData,
    salutation: request.salutation,
    firstName: request.first_name,
    lastName: request.last_name,
    email: request.email,
    contactPreference: request.contact_preference,
    phoneCountryCode: request.phone_country_code,
    phoneNumber: request.phone_number,
    preferredDealerId: request.preferred_dealer_id,
    marketingChannels: request.marketing_channels,
    status: request.status,
    adminNotes: request.admin_notes,
    handledBy: request.handled_by,
    detailsConfirmedAt: request.details_confirmed_at,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
  })

  return res.json({
    request: { ...safe, ref: requestRef(request.id) },
    vehicle: vehicle
      ? {
          id: vehicle.id,
          modelName: vehicle.model_name,
          variantLabel: vehicle.variant_label,
          basePrice: vehicle.base_price == null ? null : Number(vehicle.base_price),
          specs: vehicle.specs,
          image: vehicleImage(vehicle.id, vehicle.image_updated_at),
        }
      : null,
    dealer,
    accessories,
    messages: messages.map((m) => ({
      id: m.id,
      subject: m.subject,
      body: m.body,
      deliveryStatus: m.delivery_status,
      isAutomatic: m.sent_by == null,
      createdAt: m.created_at,
    })),
    offers,
  })
}

// PUT /api/admin/requests/:id/status
async function setStatus(req, res) {
  const { status } = req.body || {}

  if (status === 'offer_sent' || status === 'converted') {
    return res.status(400).json({ error: 'Set automatically.' })
  }
  if (!MANUAL_STATUSES.has(status)) {
    return res.status(400).json({ error: 'Statut invalide.' })
  }

  const request = await prisma.configuration_requests.findUnique({
    where: { id: req.params.id },
    select: { id: true, status: true, handled_by: true },
  })
  if (!request) {
    return res.status(404).json({ error: 'Demande introuvable.' })
  }

  // Première sortie du statut 'new' : on attribue le traitement à cet admin.
  const data = { status, updated_at: new Date() }
  if (request.status === 'new' && !request.handled_by) {
    data.handled_by = req.user.id
  }

  await prisma.configuration_requests.update({ where: { id: request.id }, data })
  logAudit(req, 'request.status', 'configuration_request', request.id, {
    from: request.status,
    to: status,
  })
  return res.json({ ok: true, status })
}

// PUT /api/admin/requests/:id/notes — notes internes, jamais exposées au client.
async function setNotes(req, res) {
  const { adminNotes } = req.body || {}
  const value =
    adminNotes === null || adminNotes === undefined ? null : String(adminNotes)

  if (value != null && value.length > NOTES_MAX) {
    return res.status(400).json({ error: 'Notes trop longues.' })
  }

  const result = await prisma.configuration_requests.updateMany({
    where: { id: req.params.id },
    data: { admin_notes: value, updated_at: new Date() },
  })
  if (result.count === 0) {
    return res.status(404).json({ error: 'Demande introuvable.' })
  }
  return res.json({ ok: true, adminNotes: value })
}

// POST /api/admin/requests/:id/messages — email manuel vers le client.
// Envoi AWAITÉ (action explicite) : l'admin doit savoir si l'envoi a échoué.
async function sendMessage(req, res) {
  const { subject, body } = req.body || {}
  const trimmedSubject = typeof subject === 'string' ? subject.trim() : ''
  const rawBody = typeof body === 'string' ? body : ''

  if (!trimmedSubject) {
    return res.status(400).json({ error: 'Subject is required.' })
  }
  if (trimmedSubject.length > SUBJECT_MAX) {
    return res.status(400).json({ error: `Subject must be ${SUBJECT_MAX} characters or less.` })
  }
  if (!rawBody.trim()) {
    return res.status(400).json({ error: 'Message body is required.' })
  }
  if (rawBody.length > BODY_MAX) {
    return res.status(400).json({ error: `Message body must be ${BODY_MAX} characters or less.` })
  }

  const request = await prisma.configuration_requests.findUnique({
    where: { id: req.params.id },
    select: { id: true, email: true, first_name: true, status: true },
  })
  if (!request) {
    return res.status(404).json({ error: 'Demande introuvable.' })
  }

  try {
    await sendAdminMessageEmail({
      to: request.email,
      firstName: request.first_name,
      subject: trimmedSubject,
      body: rawBody,
    })
  } catch (err) {
    console.error('[admin-requests] échec envoi message :', err.message)
    // La ligne 'failed' est conservée : rien n'est perdu, l'admin peut réessayer.
    await logRequestMessage({
      requestId: request.id,
      sentBy: req.user.id,
      subject: trimmedSubject,
      body: rawBody,
      deliveryStatus: 'failed',
    }).catch(() => {})
    return res.status(502).json({ error: 'Message could not be sent.' })
  }

  await logRequestMessage({
    requestId: request.id,
    sentBy: req.user.id,
    subject: trimmedSubject,
    body: rawBody,
    deliveryStatus: 'sent',
  })

  // Un premier contact fait passer la demande de 'new' à 'contacted'.
  if (request.status === 'new') {
    await prisma.configuration_requests.updateMany({
      where: { id: request.id, status: 'new' },
      data: { status: 'contacted', updated_at: new Date() },
    })
  }

  logAudit(req, 'request.message', 'configuration_request', request.id, {
    subject: trimmedSubject,
  })

  return res.json({ ok: true })
}

module.exports = {
  listRequests,
  getSummary,
  getRequestDetail,
  setStatus,
  setNotes,
  sendMessage,
}
