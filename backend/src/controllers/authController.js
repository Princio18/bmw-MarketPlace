const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { usersRepo } = require('../repositories/users')
const { verifyPassword, hashPassword } = require('../auth/passwords')
const {
  signAccessToken,
  signTwoFactorToken,
  verifyTwoFactorToken,
} = require('../auth/tokens')
const { finalizeLogin, publicUser } = require('../services/authService')
const { sendAdminOtpEmail } = require('../services/adminOtpEmail')
const {
  generateActivationToken,
  hashActivationToken,
  getActivationExpiry,
} = require('../auth/activation')
const { buildActivationLink, sendActivationEmail } = require('../services/activationEmail')
const { notify } = require('../services/adminNotifications')
const { ROLES } = require('../roles')
const { query } = require('../db')
const { isValidEmail, validatePassword } = require('../auth/validation')

function maskEmail(email) {
  const [name, domain] = String(email).split('@')
  if (!domain) return '***@***'
  return `${name.charAt(0)}***@${domain}`
}

async function register(req, res) {
  const { first_name: firstName = '', last_name: lastName = '', email = '', password } = req.body

  if (!firstName.trim() || !lastName.trim()) {
    return res.status(400).json({ error: 'Prénom et nom obligatoires.' })
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' })
  }
  if (!validatePassword(password)) {
    return res.status(400).json({
      error:
        'Mot de passe invalide : 10 à 40 caractères, une minuscule, une majuscule, un chiffre et un caractère spécial.',
    })
  }

  await query(
    `DELETE FROM users
      WHERE LOWER(email) = LOWER($1)
        AND is_active = FALSE
        AND activation_expires_at IS NOT NULL
        AND activation_expires_at < now()`,
    [email],
  )

  if (await usersRepo.findByEmail(email)) {
    return res.status(409).json({ error: 'Cette adresse email est déjà utilisée.' })
  }

  try {
    const activationToken = generateActivationToken()
    const user = await usersRepo.createClientWithActivation({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
      activationHash: hashActivationToken(activationToken),
      activationExpiresAt: getActivationExpiry(),
    })

    const activationLink = buildActivationLink(activationToken)
    sendActivationEmail({ to: email.trim(), activationLink }).catch((err) =>
      console.error(`[activation] échec envoi email à ${email.trim()} :`, err),
    )

    if (process.env.ACTIVATION_DEV_MODE !== 'false') {
      console.log(`[activation] ${activationLink}`)
    }

    const response = {
      token: signAccessToken(user),
      user: await publicUser(user),
      message: 'Registration successful. Please activate your BMW ID via the email.',
    }
    if (process.env.ACTIVATION_DEV_MODE !== 'false') {
      response.activationLink = activationLink
    }

    return res.status(201).json(response)
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Cette adresse email est déjà utilisée.' })
    }
    throw err
  }
}

async function activate(req, res) {
  const { token = '' } = req.body || {}
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: "Jeton d'activation manquant." })
  }

  const user = await usersRepo.findByActivationHash(hashActivationToken(token))
  if (!user || user.deleted_at) {
    return res.status(400).json({ error: "Lien d'activation invalide ou déjà utilisé." })
  }
  if (user.activation_expires_at && new Date(user.activation_expires_at) < new Date()) {
    return res.status(410).json({ error: "Lien d'activation expiré." })
  }

  await usersRepo.activateUser(user.id)
  // Notification admin (fire-and-forget) : nouveau client confirmé.
  notify({ type: 'new_client', message: `Nouveau client confirmé : ${user.email}` })
  return res.json({ email: user.email })
}

async function resendActivation(req, res) {
  const { email = '' } = req.body || {}
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' })
  }

  const user = await usersRepo.findByEmail(email)
  if (!user || user.deleted_at) {
    return res.status(404).json({ error: 'Aucun compte pour cette adresse email.' })
  }
  if (user.is_active) {
    return res.status(409).json({ error: 'Ce compte est déjà activé.' })
  }
  if (!user.activation_expires_at || new Date(user.activation_expires_at) < new Date()) {
    return res
      .status(410)
      .json({ error: "Lien d'activation expiré. Veuillez recommencer l'inscription." })
  }

  const activationToken = generateActivationToken()
  await query(
    `UPDATE users
        SET activation_token_hash = $2, activation_expires_at = $3, updated_at = NOW()
      WHERE id = $1`,
    [user.id, hashActivationToken(activationToken), getActivationExpiry()],
  )

  const activationLink = buildActivationLink(activationToken)
  sendActivationEmail({ to: user.email, activationLink }).catch((err) =>
    console.error(`[activation] échec renvoi email à ${user.email} :`, err),
  )

  return res.json({ sent: true, maskedEmail: maskEmail(user.email) })
}

async function login(req, res) {
  const { email = '', password = '' } = req.body || {}
  const user = await usersRepo.findByEmail(email)

  if (!user || user.deleted_at || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Identifiants incorrects.' })
  }

  if (user.role === ROLES.CLIENT && !user.is_active) {
    return res
      .status(403)
      .json({
        error:
          "Compte non activé. Vérifiez votre email d'activation ou cliquez sur le lien reçu.",
      })
  }

  if (user.role !== ROLES.ADMIN) {
    const { token, user: safeUser } = await finalizeLogin(user, req)
    return res.json({ token, user: safeUser })
  }

  const tempToken = signTwoFactorToken(user.id, '2fa-verify', {
    deviceId: (req.body || {}).deviceId || '',
  })

  const maskedEmail = await issueAdminOtp(user)
  return res.json({ requiresTwoFactor: true, tempToken, maskedEmail })
}

async function issueAdminOtp(user) {
  const code = crypto.randomInt(100000, 999999)
  const codeHash = await hashPassword(String(code))
  await query(
    `INSERT INTO admin_email_otps (user_id, code_hash, expires_at)
     VALUES ($1, $2, now() + interval '10 minutes')`,
    [user.id, codeHash],
  )
  sendAdminOtpEmail({ to: user.email, code }).catch((err) =>
    console.error('[admin-otp] échec envoi email:', err),
  )
  return maskEmail(user.email)
}

async function otpEmailSend(req, res) {
  const { tempToken = '' } = req.body || {}
  const payload = verifyTwoFactorToken(tempToken)
  if (!payload || payload.purpose !== '2fa-verify' || !payload.userId) {
    return res.status(401).json({ error: 'Jeton 2FA invalide ou expiré.' })
  }

  const user = await usersRepo.findById(payload.userId)
  if (!user || user.deleted_at) {
    return res.status(401).json({ error: 'Jeton 2FA invalide ou expiré.' })
  }

  const maskedEmail = await issueAdminOtp(user)
  return res.json({ sent: true, maskedEmail })
}

async function otpEmailVerify(req, res) {
  const { tempToken = '', code = '' } = req.body || {}
  const payload = verifyTwoFactorToken(tempToken)
  if (!payload || payload.purpose !== '2fa-verify' || !payload.userId) {
    return res.status(401).json({ error: 'Jeton 2FA invalide ou expiré.' })
  }

  const user = await usersRepo.findById(payload.userId)
  if (!user || user.deleted_at) {
    return res.status(401).json({ error: 'Jeton 2FA invalide ou expiré.' })
  }

  const devBypass =
    process.env.TWOFA_DEV_BYPASS === 'true' && /^\d{6}$/.test(code)
  let row = null
  let valid = false
  if (devBypass) {
    console.warn(
      '[otp] DEV BYPASS : code accepté sans vérif (env TWOFA_DEV_BYPASS=true)',
    )
    valid = true
  } else {
    const { rows } = await query(
      `SELECT id, code_hash FROM admin_email_otps
        WHERE user_id = $1 AND expires_at > now()
        ORDER BY created_at DESC LIMIT 1`,
      [user.id],
    )
    row = rows[0]
    valid = row ? await bcrypt.compare(String(code), row.code_hash) : false
  }
  if (!valid) {
    return res.status(400).json({ error: 'Invalid or expired code.' })
  }

  if (row) {
    await query('DELETE FROM admin_email_otps WHERE id = $1', [row.id])
  }
  const { token, user: safeUser } = await finalizeLogin(user, req, {
    deviceId: payload.deviceId,
  })
  return res.json({ token, user: safeUser })
}

async function me(req, res) {
  return res.json({ user: await publicUser(req.user) })
}

async function updateProfilePhoto(req, res) {
  const file = req.file
  if (!file) {
    return res.status(400).json({ error: 'Aucune image reçue.' })
  }
  await query(
    `UPDATE users SET profile_photo_data = $2, profile_photo_mime_type = $3, updated_at = NOW()
      WHERE id = $1`,
    [req.user.id, file.buffer, file.mimetype],
  )
  return res.json({ ok: true })
}

async function changePassword(req, res) {
  const { currentPassword = '', newPassword = '' } = req.body || {}

  const matchesCurrent = await bcrypt.compare(currentPassword, req.user.password_hash)
  if (!matchesCurrent) {
    return res.status(400).json({ error: 'Mot de passe actuel incorrect.' })
  }
  if (!validatePassword(newPassword)) {
    return res.status(400).json({
      error:
        'Mot de passe invalide : 10 à 40 caractères, une minuscule, une majuscule, un chiffre et un caractère spécial.',
    })
  }

  const passwordHash = await hashPassword(newPassword)
  await query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [passwordHash, req.user.id],
  )
  return res.json({ ok: true })
}

module.exports = {
  authController: {
    register,
    activate,
    resendActivation,
    login,
    otpEmailSend,
    otpEmailVerify,
    me,
    changePassword,
    updateProfilePhoto,
  },
}