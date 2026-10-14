const { prisma } = require('../db')
const { background } = require('../utils/background')

// Insertion d'une notification admin. Toujours déclenchée en arrière-plan :
// ne doit JAMAIS bloquer la requête principale ni retarder la réponse HTTP.
function createAdminNotification(type, message, relatedId = null) {
  return background(
    prisma.admin_notifications.create({
      data: {
        type,
        message,
        related_id: relatedId,
      },
    }),
  )
}

// Nom historique conservé pour les appels existants : délègue au nom canonique.
function notify({ type, message, relatedId = null }) {
  return createAdminNotification(type, message, relatedId)
}

module.exports = { createAdminNotification, notify }
