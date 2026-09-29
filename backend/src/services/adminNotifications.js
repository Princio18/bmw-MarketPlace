const { prisma } = require('../db')

// Insertion fire-and-forget : ne doit JAMAIS bloquer la requête principale.
function notify({ type, message, relatedId = null }) {
  prisma.admin_notifications
    .create({
      data: {
        type,
        message,
        related_id: relatedId,
      },
    })
    .catch((err) =>
      console.error(`[notify] échec insertion notification (${type}) :`, err.message),
    )
}

module.exports = { notify }
