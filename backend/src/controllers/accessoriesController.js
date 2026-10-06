const accessoryService = require('../services/accessoryService')
const { resolveImage } = require('../utils/imageResolver')

// Liste publique des accessoires actifs. Le champ `image` pointe vers
// /api/accessories/:id/image et `inStock` est calculé côté SQL.
// `?vehicleId=<uuid>` restreint la liste aux accessoires rattachés à ce
// véhicule ; un identifiant malformé est refusé (400) plutôt que d'échouer en
// 500 côté SQL.
async function listAccessories(req, res) {
  const { vehicleId } = req.query
  if (vehicleId !== undefined && vehicleId !== '') {
    if (!accessoryService.isValidAccessoryId(vehicleId)) {
      return res.status(400).json({ error: 'vehicleId invalide.' })
    }
    const accessories = await accessoryService.listActiveAccessories({ vehicleId })
    return res.json({ accessories })
  }
  const accessories = await accessoryService.listActiveAccessories()
  return res.json({ accessories })
}

// Même pattern que getVehicleImage (controllers/vehiclesController.js) :
// stockage objet prioritaire, repli BYTEA, puis placeholder.
async function getAccessoryImage(req, res) {
  try {
    if (!accessoryService.isValidAccessoryId(req.params.id)) {
      return res.redirect('/images/placeholder-accessory.svg')
    }
    const accessory = await accessoryService.findAccessoryImage(req.params.id)
    if (!accessory || (!accessory.imageKey && !accessory.imageData)) {
      return res.redirect('/images/placeholder-accessory.svg')
    }
    const image = await resolveImage({
      imageKey: accessory.imageKey,
      imageData: accessory.imageData,
      imageMimeType: accessory.imageMimeType,
      scope: 'accessories',
      id: req.params.id,
    })
    if (!image) {
      return res.redirect('/images/placeholder-accessory.svg')
    }
    res.set('Content-Type', image.contentType)
    res.set('Cache-Control', 'public, max-age=86400')
    // Même rôle que sur les véhicules : rend visible le repli BYTEA silencieux
    // de resolveImage(), sans quoi un bucket en panne passe pour un succès.
    res.set('X-Image-Source', image.source)
    return res.send(image.buffer)
  } catch (err) {
    console.error('[accessories] erreur GET /api/accessories/:id/image :', err)
    return res.status(500).json({ error: 'Unable to load accessory image.' })
  }
}

module.exports = { listAccessories, getAccessoryImage }
