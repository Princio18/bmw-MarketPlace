const accessoryService = require('../services/accessoryService')
const { toBuffer } = require('../utils/bytes')

// Liste publique des accessoires actifs. Le champ `image` pointe vers
// /api/accessories/:id/image et `inStock` est calculé côté SQL.
async function listAccessories(req, res) {
  const accessories = await accessoryService.listActiveAccessories()
  return res.json({ accessories })
}

// Même pattern que getVehicleImage (controllers/vehiclesController.js) :
// BYTEA servi tel quel, avec repli sur un placeholder quand aucune image
// n'a été téléversée par l'admin.
async function getAccessoryImage(req, res) {
  try {
    if (!accessoryService.isValidAccessoryId(req.params.id)) {
      return res.redirect('/images/placeholder-accessory.svg')
    }
    const accessory = await accessoryService.findAccessoryImage(req.params.id)
    if (!accessory || !accessory.imageData) {
      return res.redirect('/images/placeholder-accessory.svg')
    }
    const buffer = toBuffer(accessory.imageData)
    if (!buffer) {
      return res.redirect('/images/placeholder-accessory.svg')
    }
    res.set('Content-Type', accessory.imageMimeType)
    res.set('Cache-Control', 'public, max-age=86400')
    return res.send(buffer)
  } catch (err) {
    console.error('[accessories] erreur GET /api/accessories/:id/image :', err)
    return res.status(500).json({ error: 'Unable to load accessory image.' })
  }
}

module.exports = { listAccessories, getAccessoryImage }
