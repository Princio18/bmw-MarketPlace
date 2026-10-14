const { Router } = require('express')
const {
  createSavedConfiguration,
  listSavedConfigurations,
  deleteSavedConfiguration,
} = require('../controllers/savedConfigurationsController')
const { authenticate } = require('../middleware/auth')

const router = Router()

router.use(authenticate)

router.post('/', createSavedConfiguration)
router.get('/', listSavedConfigurations)
router.delete('/:id', deleteSavedConfiguration)

module.exports = router
