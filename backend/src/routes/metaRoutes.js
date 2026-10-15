const { Router } = require('express')
const { TERMS_VERSION } = require('../terms')

const router = Router()

// Métadonnées publiques consommées par le front (version des conditions
// générales affichée sur /terms, etc.). Aucune donnée sensible ici.
router.get('/', (req, res) => {
  res.json({ termsVersion: TERMS_VERSION })
})

module.exports = router
