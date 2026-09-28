const { signAccessToken } = require('../auth/tokens')
const { sendLoginAlertEmail } = require('./loginAlertEmail')
const { query } = require('../db')
const geoip = require('geoip-lite')
const UAParser = require('ua-parser-js')

async function publicUser(user) {
  let permissions = null
  if (user.role === 'admin' && !user.is_super_admin) {
    try {
      const { rows } = await query(
        `SELECT can_manage_vehicles, can_manage_orders, can_process_refunds,
                can_manage_reviews, can_view_reports, can_manage_clients
           FROM admin_permissions
          WHERE user_id = $1`,
        [user.id],
      )
      permissions = rows[0] || null
    } catch {
      permissions = null
    }
  }
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    isSuperAdmin: !!user.is_super_admin,
    hasProfilePhoto: !!user.has_profile_photo,
    is_two_factor_enabled: user.is_two_factor_enabled,
    permissions,
  }
}

async function finalizeLogin(user, req, opts = {}) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress
  const geo = geoip.lookup(ip)
  const location = geo ? `${geo.city || 'Unknown city'}, ${geo.country}` : 'Unknown location'
  const parser = new UAParser(req.headers['user-agent'])
  const result = parser.getResult()
  const device = `${result.browser.name || 'Unknown browser'} on ${result.os.name || 'Unknown OS'}`
  const loginDate = new Date().toISOString()

  const { deviceId = '' } = req.body || {}
  const finalDeviceId = typeof opts.deviceId === 'string' ? opts.deviceId : deviceId
  try {
    const { rows } = await query(
      'SELECT id FROM known_devices WHERE user_id = $1 AND device_id = $2',
      [user.id, finalDeviceId],
    )

    if (rows.length === 0) {
      await query(
        `INSERT INTO known_devices (user_id, device_id, device_label, last_ip, last_location)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, finalDeviceId, device, ip, location],
      )
      sendLoginAlertEmail({ to: user.email, device, location, loginDate }).catch(
        (err) => console.error('[login-alert] échec envoi email:', err),
      )
    } else {
      await query(
        `UPDATE known_devices SET last_seen_at = now(), last_ip = $3, last_location = $4
         WHERE user_id = $1 AND device_id = $2`,
        [user.id, finalDeviceId, ip, location],
      )
    }
  } catch (err) {
    console.error('[login-alert] suivi appareil en échec:', err)
  }

  return { token: signAccessToken(user), user: await publicUser(user) }
}

module.exports = { finalizeLogin, publicUser }