const fs = require('fs')
const path = require('path')
const { prisma } = require('../db')
const { sendMail } = require('./mailer')
const { escapeHtml } = require('../utils/escapeHtml')

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'refund-email.html')

function formatGbp(amount) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  })
    .format(Number(amount))
    .replace(/[\u202f\u00a0]/g, ' ')
}

function renderRefundEmail({ firstName, amount }) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8')
  return template
    .replaceAll('{{firstName}}', escapeHtml(firstName || 'there'))
    .replaceAll('{{amount}}', escapeHtml(formatGbp(amount)))
}

// Envoie l'email de remboursement au client. Appelé en tâche de fond depuis le
// webhook `charge.refunded`.
async function sendRefundEmail(orderId, amount) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT o.amount::float8 AS "amount", u.email, u.first_name AS "firstName"
       FROM orders o
       JOIN users u ON u.id = o.user_id
      WHERE o.id = $1`,
    orderId,
  )
  const order = rows[0]
  if (!order) throw new Error(`Order ${orderId} not found`)

  return sendMail({
    to: order.email,
    subject: 'Your refund has been initiated',
    html: renderRefundEmail({
      firstName: order.firstName,
      amount: amount != null ? amount : order.amount,
    }),
    replyTo: process.env.SUPPORT_EMAIL || undefined,
  })
}

module.exports = { sendRefundEmail, renderRefundEmail }
