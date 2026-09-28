const { Router } = require('express')
const { query } = require('../db')

const ADMIN_ROLE = "(SELECT id FROM roles WHERE name = 'admin')"

const router = Router()

router.get('/:id/photo', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT profile_photo_data, profile_photo_mime_type
         FROM users
        WHERE id = $1 AND role_id = ${ADMIN_ROLE}`,
      [req.params.id],
    )
    if (!rows[0] || !rows[0].profile_photo_data) {
      return res.redirect('/images/placeholder-avatar.svg')
    }
    res.set('Content-Type', rows[0].profile_photo_mime_type)
    res.set('Cache-Control', 'public, max-age=86400')
    return res.send(rows[0].profile_photo_data)
  } catch {
    return res.redirect('/images/placeholder-avatar.svg')
  }
})

module.exports = router