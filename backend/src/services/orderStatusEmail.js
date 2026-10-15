const fs = require('fs')
const path = require('path')
const { prisma } = require('../db')
const { sendMail } = require('./mailer')
const { escapeHtml } = require('../utils/escapeHtml')

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'order-status-email.html')

const FRONT_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// Libellés/sujets par statut. Le statut 'paid' n'envoie pas d'email ici : le
// reçu (receiptService) couvre déjà cette étape.
const STATUS_CONFIG = {
  ready: {
    subject: (order) => `Your BMW ${order.modelName} is ready`,
    headline: 'Your BMW is ready.',
    message:
      'Good news — your BMW is ready for handover. Here are the details of your appointment.',
  },
  delivered: {
    subject: (order) => `Enjoy your new BMW ${order.modelName}`,
    headline: 'Enjoy your new BMW.',
    message:
      'Your BMW has been handed over. We hope you enjoy every mile. If you have a moment, a review would mean a lot to us.',
    button: { text: 'Leave a review', href: (order) => `${FRONT_URL}/my-orders/${order.id}` },
  },
  cancelled: {
    subject: () => 'Your order has been cancelled',
    headline: 'Your order has been cancelled.',
    message: 'Your order has been cancelled. Contact us for details.',
  },
}

function formatDateTime(value) {
  if (!value) return null
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function detailRow(label, value) {
  if (!value) return ''
  return `              <tr>
                <td style="padding: 4px 0; font-size: 14px; line-height: 20px; color: #6b7280;">${escapeHtml(label)}</td>
                <td style="padding: 4px 0; font-size: 14px; line-height: 20px; color: #1a1a1a; font-weight: bold; text-align: right;">${escapeHtml(value)}</td>
              </tr>`
}

function renderDetails(items) {
  const rows = items.filter(Boolean).join('\n')
  if (!rows) return ''
  return `              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 0 24px 0;">
${rows}
              </table>`
}

function renderButton(button) {
  if (!button) return ''
  return `              <p style="margin: 0 0 12px 0;">
                <a href="${escapeHtml(button.href)}" style="display: inline-block; background-color: #0066b1; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 14px 28px;">
                  ${escapeHtml(button.text)}
                </a>
              </p>`
}

function renderOrderStatusEmail({ headline, message, detailsHtml, buttonHtml }) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8')
  return template
    .replaceAll('{{headline}}', escapeHtml(headline))
    .replaceAll('{{message}}', escapeHtml(message))
    .replaceAll('{{details}}', detailsHtml)
    .replaceAll('{{button}}', buttonHtml)
}

// Envoie l'email correspondant au statut courant de la commande (ready /
// delivered / cancelled). Réutilisé par la route admin de transition.
async function sendOrderStatusEmail(orderId) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       o.id,
       o.processing_status AS "processingStatus",
       o.scheduled_handover_at AS "scheduledHandoverAt",
       o.vin,
       u.email,
       u.first_name AS "firstName",
       v.model_name AS "modelName",
       v.variant_label AS "variantLabel",
       d.name AS "dealerName",
       d.city AS "dealerCity"
     FROM orders o
     JOIN users u ON u.id = o.user_id
     JOIN vehicles v ON v.id = o.vehicle_id
     LEFT JOIN dealers d ON d.id = o.handover_dealer_id
     WHERE o.id = $1`,
    orderId,
  )
  const order = rows[0]
  if (!order) throw new Error(`Order ${orderId} not found`)

  const config = STATUS_CONFIG[order.processingStatus]
  if (!config) return { emailSent: false, skipped: true }

  const details = renderDetails([
    detailRow('Order reference', `#${order.id.slice(0, 8)}`),
    detailRow(
      'Vehicle',
      `${order.modelName}${order.variantLabel ? ` — ${order.variantLabel}` : ''}`,
    ),
    config === STATUS_CONFIG.ready ? detailRow('Handover on', formatDateTime(order.scheduledHandoverAt)) : '',
    config === STATUS_CONFIG.ready ? detailRow('Retailer', order.dealerName ? `${order.dealerName}${order.dealerCity ? `, ${order.dealerCity}` : ''}` : null) : '',
    config === STATUS_CONFIG.ready ? detailRow('VIN', order.vin) : '',
  ])

  const button = config.button
    ? { text: config.button.text, href: config.button.href(order) }
    : null

  await sendMail({
    to: order.email,
    subject: config.subject(order),
    html: renderOrderStatusEmail({
      headline: config.headline,
      message: config.message,
      detailsHtml: details,
      buttonHtml: button ? renderButton(button) : '',
    }),
    replyTo: process.env.SUPPORT_EMAIL || undefined,
  })

  return { emailSent: true }
}

module.exports = { sendOrderStatusEmail, renderOrderStatusEmail }
