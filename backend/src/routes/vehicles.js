const { Router } = require('express')
const {
  getVehicles,
  getPriceRange,
  getVehicleById,
  getVehicleImage,
} = require('../controllers/vehiclesController')
const {
  getVehicleReviews,
  getReviewSummary,
} = require('../controllers/reviewsController')

const router = Router()

router.get('/price-range', getPriceRange)
router.get('/', getVehicles)
router.get('/:id/image', getVehicleImage)
router.get('/:id/reviews', getVehicleReviews)
router.get('/:id/reviews/summary', getReviewSummary)
router.get('/:id', getVehicleById)

module.exports = router