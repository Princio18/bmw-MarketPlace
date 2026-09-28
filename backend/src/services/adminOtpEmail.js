const fs = require('fs')
const path = require('path')
const { sendMail } = require('./mailer')

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'admin-otp-email.html')

function renderAdminOtpEmail({ code }) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8')
  return template.replaceAll('{{code}}', code)
}

async function sendAdminOtpEmail({ to, code }) {
  const html = renderAdminOtpEmail({ code })

  if (process.env.ACTIVATION_DEV_MODE !== 'false') {
    console.log(`[admin-otp] to=${to} code=${code}`)
  }

  return sendMail({
    to,
    subject: 'Your BMW Marketplace admin verification code',
    html,
  })
}

module.exports = { renderAdminOtpEmail, sendAdminOtpEmail }