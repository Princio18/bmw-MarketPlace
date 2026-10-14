const { prisma } = require('../db')

// Passe à 'expired' toute offre 'active' dont la date limite est dépassée.
// Appelé au début des routes qui lisent ou manipulent des offres : sans cela,
// une offre périmée resterait payable tant qu'une autre route ne l'a pas
// « remarquée ».
async function expireStaleOffers() {
  await prisma.$executeRawUnsafe(
    `UPDATE offers
        SET status = 'expired', updated_at = now()
      WHERE status = 'active'
        AND expires_at IS NOT NULL
        AND expires_at < now()`,
  )
}

// Offre active d'une demande, ou null. Les expirations sont purgées avant.
async function findActiveOfferForRequest(requestId) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM offers
      WHERE request_id = $1 AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1`,
    requestId,
  )
  return rows[0] || null
}

module.exports = { expireStaleOffers, findActiveOfferForRequest }
