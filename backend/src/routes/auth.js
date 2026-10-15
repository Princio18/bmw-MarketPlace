const { Router } = require('express')
const rateLimit = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')
const { authController } = require('../controllers/authController')
const { authenticate } = require('../middleware/auth')
const { dbRateLimit } = require('../middleware/dbRateLimit')
const upload = require('../middleware/upload')

const router = Router()

// 10 tentatives de connexion / 15 min, par couple IP + identifiant. Une limite
// par IP seule punirait tout un réseau d'entreprise derrière une même sortie.
const loginLimiter = dbRateLimit({
  name: 'login',
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) =>
    `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}`,
})

// 10 inscriptions / heure par IP.
const registerLimiter = dbRateLimit({
  name: 'register',
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyFn: (req) => req.ip,
})

const tempTokenKeyGenerator = (req) => req.body?.tempToken || ipKeyGenerator(req)

const otpSendLimiter = dbRateLimit({
  name: 'otp-send',
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyFn: tempTokenKeyGenerator,
})

const otpVerifyLimiter = dbRateLimit({
  name: 'otp-verify',
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyFn: tempTokenKeyGenerator,
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

router.post('/register', registerLimiter, authController.register)
router.post('/activate', authController.activate)
router.post('/resend-activation', resendActivationLimiter, authController.resendActivation)
router.post('/login', loginLimiter, authController.login)
router.post('/otp/email/send', otpSendLimiter, authController.otpEmailSend)
router.post('/otp/email/verify', otpVerifyLimiter, authController.otpEmailVerify)

router.use(authenticate)

router.get('/me', authController.me)
router.put('/change-password', authController.changePassword)
router.put('/profile-photo', upload.single('photo'), authController.updateProfilePhoto)

module.exports = router