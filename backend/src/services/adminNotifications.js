const { pool } = require('../db')

// Insertion fire-and-forget : ne doit JAMAIS bloquer la requête principale.
function notify({ type, message, relatedId = null }) {
  pool
    .query(
      `INSERT INTO admin_notifications (type, message, related_id)
       VALUES ($1, $2, $3)`,
      [type, message, relatedId],
    )
    .catch((err) =>
      console.error(`[notify] échec insertion notification (${type}) :`, err.message),
    )
}

module.exports = { notify }