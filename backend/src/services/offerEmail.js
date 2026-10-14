const fs = require('fs')
const path = require('path')
const { prisma } = require('../db')
const { sendMail } = require('./mailer')
const { escapeHtml } = require('../utils/escapeHtml')

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'offer-email.html')

function formatGbp(amount) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  })
    .format(Number(amount))
    .replace(/[\u202f\u00a0]/g, ' ')
}

// Tableau des lignes de l'offre. Les libellés viennent de la base ou des specs
// (saisis par un admin) : échappés avant injection HTML. Une ligne non comptée
// (accessoire en rupture) est signalée « subject to availability ».
function renderLinesHtml(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return ''
  const rows = lines
    .map((line) => {
      const available = line.counted !== false
      const label = escapeHtml(line.label)
      const note = available
        ? ''
        : ' <span style="color:#b45309; font-size:12px;">(subject to availability)</span>'
      const amount = available ? escapeHtml(formatGbp(line.amount)) : '—'
      return `        <tr>
          <td style="padding: 6px 0; font-size: 14px; line-height: 20px; color: #1a1a1a;">${label}${note}</td>
          <td align="right" style="padding: 6px 0; font-size: 14px; line-height: 20px; color: #1a1a1a; white-space: nowrap;">${amount}</td>
        </tr>`
    })
    .join('\n')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 0 16px 0;">
${rows}
      </table>`
}

function deliveryText(min, max) {
  if (min == null && max == null) return ''
  if (min != null && max != null) return `Estimated delivery: ${min}–${max} weeks.`
  if (min != null) return `Estimated delivery: from ${min} weeks.`
  return `Estimated delivery: up to ${max} weeks.`
}

function renderOfferEmail({ firstName, modelName, lines, total, delivery, notes, validUntil, ctaUrl }) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8')
  const notesHtml = notes
    ? `<p style="margin: 0 0 20px 0; font-size: 14px; line-height: 20px;">${escapeHtml(
        notes,
      ).replace(/\r?\n/g, '<br />')}</p>`
    : ''
  const deliveryHtml = delivery
    ? `<p style="margin: 0 0 12px 0; font-size: 14px; line-height: 20px;">${escapeHtml(
        delivery,
      )}</p>`
    : ''

  return template
    .replaceAll('{{firstName}}', escapeHtml(firstName || 'there'))
    .replaceAll('{{modelName}}', escapeHtml(modelName || 'BMW'))
    .replaceAll('{{lines}}', renderLinesHtml(lines))
    .replaceAll('{{total}}', escapeHtml(formatGbp(total)))
    .replaceAll('{{delivery}}', deliveryHtml)
    .replaceAll('{{notes}}', notesHtml)
    .replaceAll('{{validUntil}}', escapeHtml(validUntil))
    .replaceAll('{{ctaUrl}}', escapeHtml(ctaUrl))
}

// Charge offre + demande + véhicule et envoie l'email d'offre. Réutilisé par
// l'émission (POST .../offers) et le renvoi manuel (POST .../resend).
async function sendOfferEmailByOfferId(offerId) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       o.id,
       o.total_amount::float8 AS "totalAmount",
       o.price_breakdown AS "priceBreakdown",
       o.delivery_weeks_min AS "deliveryWeeksMin",
       o.delivery_weeks_max AS "deliveryWeeksMax",
       o.notes,
       o.expires_at AS "expiresAt",
       r.email,
       r.first_name AS "firstName",
       v.model_name AS "modelName"
     FROM offers o
     JOIN configuration_requests r ON r.id = o.request_id
     JOIN vehicles v ON v.id = o.vehicle_id
     WHERE o.id = $1`,
    offerId,
  )
  const offer = rows[0]
  if (!offer) throw new Error(`Offer ${offerId} not found`)

  const breakdown = offer.priceBreakdown || {}
  const validUntil = offer.expiresAt
    ? new Date(offer.expiresAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'further notice'

  const frontUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  return sendMail({
    to: offer.email,
    subject: `Your personalised BMW ${offer.modelName} offer`,
    html: renderOfferEmail({
      firstName: offer.firstName,
      modelName: offer.modelName,
      lines: breakdown.lines || [],
      total: offer.totalAmount,
      delivery: deliveryText(offer.deliveryWeeksMin, offer.deliveryWeeksMax),
      notes: offer.notes,
      validUntil,
      ctaUrl: `${frontUrl}/offers/${offer.id}`,
    }),
    replyTo: process.env.SUPPORT_EMAIL || undefined,
  })
}

module.exports = { renderOfferEmail, sendOfferEmailByOfferId }
