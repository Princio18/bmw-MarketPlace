const { Router } = require('express')
const {
  listAdminReviews,
  setReviewStatus,
  deleteReview,
} = require('../controllers/reviewsController')
const { authenticate, requireRole } = require('../middleware/auth')
const { checkPermission } = require('../middleware/checkPermission')
const { ROLES } = require('../roles')

const router = Router()

router.use(authenticate)
router.use(requireRole(ROLES.ADMIN))

router.get('/', checkPermission('can_manage_reviews'), listAdminReviews)
router.put('/:id/status', checkPermission('can_manage_reviews'), setReviewStatus)
router.delete('/:id', checkPermission('can_manage_reviews'), deleteReview)

module.exports = router