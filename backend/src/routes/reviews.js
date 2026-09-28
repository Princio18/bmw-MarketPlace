const { Router } = require('express')
const { createReview } = require('../controllers/reviewsController')
const { authenticate } = require('../middleware/auth')

const router = Router()

router.use(authenticate)

router.post('/', createReview)

module.exports = router