const multer = require('multer')

// Garde-fou : au-dela de cette taille, l'image est signalee car elle rendra
// les grilles (/all-models) lentes. Les images du catalogue font 110-270 Ko.
const WARN_ABOVE_BYTES = 400 * 1024
const MAX_BYTES = 2 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowed.includes(file.mimetype)) {
      return cb(null, false)
    }
    if (file.size > WARN_ABOVE_BYTES) {
      console.warn(
        `[upload] Image volumineuse : ${file.originalname} (${Math.round(file.size / 1024)} Ko). ` +
          'Pensez a la compresser avant envoi, les grilles de vehicules la chargeront en entier.',
      )
    }
    cb(null, true)
  },
})

module.exports = upload