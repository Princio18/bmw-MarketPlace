const { Router } = require('express')
const rateLimit = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')
const { authController } = require('../controllers/authController')
const { authenticate } = require('../middleware/auth')
const upload = require('../middleware/upload')

const router = Router()

const tempTokenKeyGenerator = (req) => req.body?.tempToken || ipKeyGenerator(req)

const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  keyGenerator: tempTokenKeyGenerator,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many emails sent. Please try again later.' },
})

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: tempTokenKeyGenerator,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
})

const resendActivationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) =>
    String(req.body?.email || '').trim().toLowerCase() || ipKeyGenerator(req),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many activation emails. Please try again later.' },
})

router.post('/register', authController.register)
router.post('/activate', authController.activate)
router.post('/resend-activation', resendActivationLimiter, authController.resendActivation)
router.post('/login', authController.login)
router.post('/otp/email/send', otpSendLimiter, authController.otpEmailSend)
router.post('/otp/email/verify', otpVerifyLimiter, authController.otpEmailVerify)

router.use(authenticate)

router.get('/me', authController.me)
router.put('/change-password', authController.changePassword)
router.put('/profile-photo', upload.single('photo'), authController.updateProfilePhoto)

module.exports = router