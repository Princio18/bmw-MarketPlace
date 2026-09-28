const fs = require('fs')
const path = require('path')
const { sendMail } = require('./mailer')

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'login-alert-email.html')
const DEFAULT_FRONTEND_URL = 'http://localhost:5173'

function buildResetPasswordLink() {
  const base = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL
  return `${base}/reset-password`
}

function renderLoginAlertEmail({ device, location, loginDate }) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8')
  return template
    .replaceAll('{{device}}', device)
    .replaceAll('{{location}}', location)
    .replaceAll('{{loginDate}}', loginDate)
    .replaceAll('{{resetPasswordLink}}', buildResetPasswordLink())
}

async function sendLoginAlertEmail({ to, device, location, loginDate }) {
  const html = renderLoginAlertEmail({ device, location, loginDate })

  if (process.env.ACTIVATION_DEV_MODE !== 'false') {
    console.log(
      `[login-alert] to=${to} device="${device}" location="${location}" loginDate="${loginDate}"`,
    )
  }

  return sendMail({
    to,
    subject: 'New sign-in on your BMW Marketplace account',
    html,
  })
}

module.exports = { renderLoginAlertEmail, sendLoginAlertEmail }