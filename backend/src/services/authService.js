const { signAccessToken } = require('../auth/tokens')
const { sendLoginAlertEmail } = require('./loginAlertEmail')
const { prisma } = require('../db')
const geoip = require('geoip-lite')
const UAParser = require('ua-parser-js')

async function publicUser(user) {
  let permissions = null
  if (user.role === 'admin' && !user.is_super_admin) {
    try {
      const row = await prisma.admin_permissions.findFirst({
        where: { user_id: user.id },
        select: {
          can_manage_vehicles: true,
          can_manage_orders: true,
          can_process_refunds: true,
          can_manage_reviews: true,
          can_view_reports: true,
          can_manage_clients: true,
        },
      })
      permissions = row || null
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
    const existing = await prisma.known_devices.findFirst({
      where: { user_id: user.id, device_id: finalDeviceId },
      select: { id: true },
    })

    if (!existing) {
      await prisma.known_devices.create({
        data: {
          user_id: user.id,
          device_id: finalDeviceId,
          device_label: device,
          last_ip: ip,
          last_location: location,
        },
      })
      sendLoginAlertEmail({ to: user.email, device, location, loginDate }).catch(
        (err) => console.error('[login-alert] échec envoi email:', err),
      )
    } else {
      await prisma.known_devices.updateMany({
        where: { user_id: user.id, device_id: finalDeviceId },
        data: { last_seen_at: new Date(), last_ip: ip, last_location: location },
      })
    }
  } catch (err) {
    console.error('[login-alert] suivi appareil en échec:', err)
  }

  return { token: signAccessToken(user), user: await publicUser(user) }
}

module.exports = { finalizeLogin, publicUser }
