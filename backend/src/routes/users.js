const { Router } = require('express')
const { prisma } = require('../db')
const { toBuffer } = require('../utils/bytes')

const router = Router()

router.get('/:id/photo', async (req, res) => {
  try {
    const user = await prisma.users.findFirst({
      where: { id: req.params.id, role: { name: 'admin' } },
      select: { profile_photo_data: true, profile_photo_mime_type: true },
    })
    if (!user || !user.profile_photo_data) {
      return res.redirect('/images/placeholder-avatar.svg')
    }
    const buffer = toBuffer(user.profile_photo_data)
    if (!buffer) {
      return res.redirect('/images/placeholder-avatar.svg')
    }
    res.set('Content-Type', user.profile_photo_mime_type)
    res.set('Cache-Control', 'public, max-age=86400')
    return res.send(buffer)
  } catch {
    return res.redirect('/images/placeholder-avatar.svg')
  }
})

module.exports = router
