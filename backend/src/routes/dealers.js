const { Router } = require('express')
const { getDealers } = require('../controllers/dealerController')

const router = Router()

// GET /api/dealers — publique, sans authentification.
router.get('/', getDealers)

module.exports = router