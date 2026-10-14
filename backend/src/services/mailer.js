const nodemailer = require('nodemailer')

let transporter = null

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT)
}

function getTransporter() {
  if (!transporter && isSmtpConfigured()) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    })
  }
  return transporter
}

async function sendMail({ to, subject, html, attachments, replyTo }) {
  if (isSmtpConfigured()) {
    const client = getTransporter()
    return client.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER || 'BMW Marketplace',
      to,
      subject,
      html,
      attachments,
      // Adresse surveillée (ex. SUPPORT_EMAIL) vers laquelle un client qui
      // répond est redirigé : l'email personnel de l'admin n'est jamais exposé.
      replyTo,
    })
  }

  if (process.env.ACTIVATION_DEV_MODE !== 'false') {
    console.log(`[mail] to=${to} subject="${subject}${replyTo ? ` replyTo=${replyTo}` : ''}${attachments?.length ? ` attachments=${attachments.length}` : ''}"\n${html}`)
  }
  return { messageId: 'dev-log', dev: true }
}

module.exports = { sendMail, isSmtpConfigured }