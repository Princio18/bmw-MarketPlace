const fs = require('fs')
const path = require('path')
const { sendMail } = require('./mailer')
const { escapeHtml } = require('../utils/escapeHtml')

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'admin-message-email.html')

// Le corps saisi par l'admin est TOUJOURS échappé avant insertion HTML, puis
// les sauts de ligne sont convertis en <br> : aucune balise injectée ne peut
// s'exécuter dans la boîte mail du client.
function renderAdminMessageEmail({ firstName, body }) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8')
  const safeBody = escapeHtml(body).replace(/\r?\n/g, '<br />')
  return template
    .replaceAll('{{firstName}}', escapeHtml(firstName || 'there'))
    .replaceAll('{{body}}', safeBody)
}

// Envoi d'un message écrit par un admin. Reply-To = SUPPORT_EMAIL : l'adresse
// personnelle de l'admin n'est jamais exposée au client.
async function sendAdminMessageEmail({ to, firstName, subject, body }) {
  const html = renderAdminMessageEmail({ firstName, body })
  return sendMail({
    to,
    subject,
    html,
    replyTo: process.env.SUPPORT_EMAIL || undefined,
  })
}

module.exports = { renderAdminMessageEmail, sendAdminMessageEmail }
