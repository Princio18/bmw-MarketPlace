const fs = require('fs')
const path = require('path')
const { sendMail } = require('./mailer')

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'request-received-email.html')
const DEFAULT_FRONTEND_URL = 'http://localhost:5173'

function buildViewRequestLink() {
  const base = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL
  return `${base}/my-requests`
}

function renderRequestReceivedEmail({ firstName, modelName, requestRef }) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8')
  return template
    .replaceAll('{{firstName}}', firstName || 'there')
    .replaceAll('{{modelName}}', modelName)
    .replaceAll('{{requestRef}}', requestRef)
    .replaceAll('{{viewRequestLink}}', buildViewRequestLink())
}

async function sendRequestReceivedEmail({ to, firstName, modelName, requestRef }) {
  const html = renderRequestReceivedEmail({ firstName, modelName, requestRef })

  if (process.env.ACTIVATION_DEV_MODE !== 'false') {
    console.log(
      `[request-received] to=${to} model="${modelName}" ref="${requestRef}"`,
    )
  }

  return sendMail({
    to,
    subject: 'We received your BMW configuration request',
    html,
  })
}

module.exports = { renderRequestReceivedEmail, sendRequestReceivedEmail }
