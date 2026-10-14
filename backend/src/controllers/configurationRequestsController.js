const { prisma, pgSafe } = require('../db')
const { background } = require('../utils/background')
const { requestRef } = require('../utils/requestRef')
const { createAdminNotification } = require('../services/adminNotifications')
const { sendRequestReceivedEmail } = require('../services/requestReceivedEmail')
const { sendAndLogRequestMessage } = require('../services/requestMessages')
const CONTACT_PREFERENCES = new Set(['email', 'phone'])
const SALUTATIONS = new Set(['Mr', 'Ms', 'Mrs', 'Miss', 'Dr', 'Mx'])
const PHONE_COUNTRY_CODES = new Set(['+44', '+33', '+49', '+353', '+1'])
const MARKETING_CHANNELS = new Set(['apps', 'email', 'phone', 'sms', 'in_car', 'mail'])
const MAX_CONFIGURATION_DATA_BYTES = 256 * 1024
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000

const EMAIL_MAX = 255
const NAME_MAX = 100
const PHONE_MAX = 30

// Statuts sur lesquels le client ne peut plus modifier sa demande.
const LOCKED_STATUSES = new Set(['converted', 'closed'])

// Prénoms/noms réalistes : uniquement des lettres (accents inclus), espaces,
// apostrophes, points et tirets. Jamais de chiffres ni de balises.
const NAME_REGEX = /^[A-Za-zÀ-ÿ' .-]+$/

function trimOrNull(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function validateName(value, max) {
  const trimmed = trimOrNull(value)
  if (!trimmed) return { error: 'Ce champ est requis.' }
  if (trimmed.length > max) return { error: `Ce champ doit faire au plus ${max} caractères.` }
  if (!NAME_REGEX.test(trimmed)) return { error: 'Caractères non autorisés.' }
  return { value: trimmed }
}

function validatePhoneNumber(value) {
  // On conserve les chiffres (espaces, tirets, parenthèses, points autorisés
  // pour la saisie) puis on exige 7 à 15 chiffres (format E.164).
  const digits = String(value).replace(/[\s\-().]/g, '').replace(/[^0-9]/g, '')
  if (digits.length < 7 || digits.length > 15) {
    return { error: 'Numéro de téléphone invalide (7 à 15 chiffres).' }
  }
  if (digits.length > PHONE_MAX) {
    return { error: `Le numéro doit faire au plus ${PHONE_MAX} chiffres.` }
  }
  return { digits }
}

function validateConfigurationData(value) {
  if (value === undefined || value === null) return { value: null }
  if (Array.isArray(value) || typeof value !== 'object') {
    return { error: 'Données de configuration invalides.' }
  }
  try {
    const size = Buffer.byteLength(JSON.stringify(value), 'utf8')
    if (size > MAX_CONFIGURATION_DATA_BYTES) {
      return { error: 'Données de configuration trop volumineuses.' }
    }
  } catch {
    return { error: 'Données de configuration invalides.' }
  }
  return { value }
}

function validateMarketingChannels(value) {
  if (value === undefined) return { value: null }
  if (value === null) return { value: null }
  if (!Array.isArray(value)) {
    return { error: 'Canaux de marketing invalides.' }
  }
  if (!value.every((c) => MARKETING_CHANNELS.has(c))) {
    return { error: 'Canal de marketing inconnu.' }
  }
  return { value }
}

// Valide l'ensemble des champs « coordonnées » d'une demande. Utilisé par le
// PUT (les noms et le concessionnaire sont alors obligatoires). L'email n'est
// jamais validé ici : il n'est pas modifiable via cette route.
function validateRequestDetails(body) {
  const salutation = trimOrNull(body.salutation)
  if (salutation && !SALUTATIONS.has(salutation)) {
    return { error: 'Civilité invalide.' }
  }

  const firstName = validateName(body.firstName, NAME_MAX)
  if ('error' in firstName) {
    return { error: `Prénom : ${firstName.error}` }
  }

  const lastName = validateName(body.lastName, NAME_MAX)
  if ('error' in lastName) {
    return { error: `Nom : ${lastName.error}` }
  }

  const contactPreference = trimOrNull(body.contactPreference)
  if (!contactPreference || !CONTACT_PREFERENCES.has(contactPreference)) {
    return { error: 'Moyen de contact invalide.' }
  }

  const phoneCountryCode = trimOrNull(body.phoneCountryCode)
  const phoneNumber = trimOrNull(body.phoneNumber)

  if (contactPreference === 'phone' && (!phoneCountryCode || !phoneNumber)) {
    return {
      error:
        'Le numéro de téléphone est requis lorsque le contact par téléphone est choisi.',
    }
  }

  if (phoneNumber) {
    if (!phoneCountryCode || !PHONE_COUNTRY_CODES.has(phoneCountryCode)) {
      return { error: 'Indicatif téléphonique invalide.' }
    }
    const phone = validatePhoneNumber(phoneNumber)
    if ('error' in phone) {
      return { error: `Téléphone : ${phone.error}` }
    }
  }

  const preferredDealerId = trimOrNull(body.preferredDealerId)
  if (!preferredDealerId) {
    return { error: 'Concessionnaire préféré requis.' }
  }

  const marketingChannels = validateMarketingChannels(body.marketingChannels)
  if ('error' in marketingChannels) {
    return { error: marketingChannels.error }
  }

  return {
    value: {
      salutation,
      firstName: firstName.value,
      lastName: lastName.value,
      contactPreference,
      phoneCountryCode,
      phoneNumber,
      preferredDealerId,
      marketingChannels: marketingChannels.value,
    },
  }
}

// POST /api/configuration-requests — authentifié. Crée immédiatement la
// demande au « Save and Confirm », préremplie depuis le compte. Un second envoi
// (< 10 min, même véhicule, statut 'new') renvoie la demande existante sans
// créer de doublon ni renvoyer d'email / notification.
async function createConfigurationRequest(req, res) {
  const body = req.body || {}
  const userId = req.user.id

  const vehicleId = trimOrNull(body.vehicleId)
  if (!vehicleId) {
    return res.status(400).json({ error: 'Véhicule requis.' })
  }

  const vehicle = await prisma.vehicles.findUnique({ where: { id: vehicleId } })
  if (!vehicle || vehicle.deleted_at) {
    return res.status(400).json({ error: 'Véhicule invalide.' })
  }

  const configurationData = validateConfigurationData(body.configurationData)
  if ('error' in configurationData) {
    return res.status(400).json({ error: configurationData.error })
  }

  try {
    const threshold = new Date(Date.now() - DUPLICATE_WINDOW_MS)
    const existing = await prisma.configuration_requests.findFirst({
      where: {
        user_id: userId,
        vehicle_id: vehicleId,
        status: 'new',
        created_at: { gte: threshold },
      },
      orderBy: { created_at: 'desc' },
      select: { id: true },
    })

    if (existing) {
      return res.status(200).json({ id: existing.id, ref: requestRef(existing.id) })
    }

    const request = await prisma.configuration_requests.create({
      data: {
        user_id: userId,
        vehicle_id: vehicleId,
        configuration_data: configurationData.value,
        first_name: trimOrNull(req.user.first_name),
        last_name: trimOrNull(req.user.last_name),
        email: String(req.user.email).toLowerCase(),
      },
      select: { id: true },
    })

    background(
      sendAndLogRequestMessage({
        requestId: request.id,
        subject: 'We received your BMW configuration request',
        body: 'Automatic acknowledgement email sent to the customer.',
        send: () =>
          sendRequestReceivedEmail({
            to: req.user.email,
            firstName: trimOrNull(req.user.first_name),
            modelName: vehicle.model_name,
            requestRef: requestRef(request.id),
          }),
      }),
    )
    createAdminNotification(
      'new_request',
      `New request for ${vehicle.model_name} from ${req.user.email}`,
      request.id,
    )

    return res.status(201).json({ id: request.id, ref: requestRef(request.id) })
  } catch (err) {
    console.error('[configuration-requests] Erreur POST :', err)
    return res.status(500).json({ error: 'Impossible de soumettre la demande.' })
  }
}

// GET /api/configuration-requests/mine — liste des demandes de l'utilisateur.
async function listMyRequests(req, res) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       r.id,
       r.vehicle_id AS "vehicleId",
       r.status,
       r.created_at AS "createdAt",
       v.model_name AS "modelName",
       v.variant_label AS "variantLabel",
       '/api/vehicles/' || v.id || '/image?v=' || COALESCE((EXTRACT(EPOCH FROM v.image_updated_at) * 1000)::bigint, 0) AS "image",
       d.name AS "dealerName",
       d.city AS "dealerCity"
     FROM configuration_requests r
     JOIN vehicles v ON v.id = r.vehicle_id
     LEFT JOIN dealers d ON d.id = r.preferred_dealer_id
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC`,
    req.user.id,
  )
  const requests = pgSafe(rows).map((row) => ({ ...row, ref: requestRef(row.id) }))
  return res.json({ requests })
}

// GET /api/configuration-requests/:id — propriétaire uniquement (404 sinon).
async function getConfigurationRequest(req, res) {
  const request = await prisma.configuration_requests.findFirst({
    where: { id: req.params.id, user_id: req.user.id },
  })
  if (!request) {
    return res.status(404).json({ error: 'Demande introuvable.' })
  }

  const safe = pgSafe({
    id: request.id,
    vehicleId: request.vehicle_id,
    configurationData: request.configuration_data,
    salutation: request.salutation,
    firstName: request.first_name,
    lastName: request.last_name,
    contactPreference: request.contact_preference,
    email: request.email,
    phoneCountryCode: request.phone_country_code,
    phoneNumber: request.phone_number,
    preferredDealerId: request.preferred_dealer_id,
    marketingChannels: request.marketing_channels,
    status: request.status,
    detailsConfirmedAt: request.details_confirmed_at,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
  })
  return res.json({ request: { ...safe, ref: requestRef(request.id) } })
}

// PUT /api/configuration-requests/:id — propriétaire uniquement. Met à jour la
// MÊME ligne, ne touche JAMAIS au statut, et recopie prénom/nom dans le compte
// s'ils sont encore vides.
async function updateConfigurationRequest(req, res) {
  const request = await prisma.configuration_requests.findFirst({
    where: { id: req.params.id, user_id: req.user.id },
    select: { id: true, status: true, user_id: true },
  })
  if (!request) {
    return res.status(404).json({ error: 'Demande introuvable.' })
  }
  if (LOCKED_STATUSES.has(request.status)) {
    return res
      .status(409)
      .json({ error: 'Cette demande ne peut plus être modifiée.' })
  }

  const body = req.body || {}
  const details = validateRequestDetails(body)
  if ('error' in details) {
    return res.status(400).json({ error: details.error })
  }

  const dealer = await prisma.dealers.findUnique({
    where: { id: details.value.preferredDealerId },
    select: { id: true },
  })
  if (!dealer) {
    return res.status(400).json({ error: 'Concessionnaire sélectionné invalide.' })
  }

  const now = new Date()
  try {
    const updated = await prisma.configuration_requests.update({
      where: { id: request.id },
      data: {
        salutation: details.value.salutation,
        first_name: details.value.firstName,
        last_name: details.value.lastName,
        contact_preference: details.value.contactPreference,
        phone_country_code: details.value.phoneCountryCode,
        phone_number: details.value.phoneNumber,
        preferred_dealer_id: details.value.preferredDealerId,
        marketing_channels: details.value.marketingChannels,
        details_confirmed_at: now,
        updated_at: now,
      },
      select: { id: true },
    })

    // Recopie dans le compte : uniquement si le champ est encore vide.
    await prisma.$executeRawUnsafe(
      `UPDATE users
          SET first_name = COALESCE(NULLIF(first_name, ''), $2),
              last_name  = COALESCE(NULLIF(last_name, ''), $3),
              updated_at = now()
        WHERE id = $1`,
      req.user.id,
      details.value.firstName,
      details.value.lastName,
    )

    return res.json({ id: updated.id, ref: requestRef(updated.id) })
  } catch (err) {
    console.error('[configuration-requests] Erreur PUT :', err)
    return res.status(500).json({ error: 'Impossible de mettre à jour la demande.' })
  }
}

module.exports = {
  createConfigurationRequest,
  listMyRequests,
  getConfigurationRequest,
  updateConfigurationRequest,
}
