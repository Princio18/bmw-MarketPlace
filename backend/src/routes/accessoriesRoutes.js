const { Router } = require('express')
const { getAccessoryImage, listAccessories } = require('../controllers/accessoriesController')

const router = Router()

// Routes publiques : aucune authentification requise.
router.get('/', listAccessories)
// Déclaré AVANT toute route paramétrique pour ne pas être capturé par `/:id`.
router.get('/:id/image', getAccessoryImage)

module.exports = router
