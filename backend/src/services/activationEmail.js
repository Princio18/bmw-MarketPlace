const fs = require('fs')
const path = require('path')
const { sendMail } = require('./mailer')

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'activation-email.html')
const DEFAULT_FRONTEND_URL = 'http://localhost:5173'

function buildActivationLink(token) {
  const base = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL
  return `${base}/register?token=${token}`
}

function renderActivationEmail(activationLink) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8')
  return template.replaceAll('{{activationLink}}', activationLink)
}

async function sendActivationEmail({ to, activationLink }) {
  if (process.env.ACTIVATION_DEV_MODE !== 'false') {
    console.log(`[activation] to=${to} lien=${activationLink}`)
  }

  return sendMail({
    to,
    subject: 'Confirm your BMW ID registration',
    html: renderActivationEmail(activationLink),
  })
}

module.exports = { buildActivationLink, renderActivationEmail, sendActivationEmail }