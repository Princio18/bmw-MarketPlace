const { prisma } = require('../db')

// Route publique : liste des concessionnaires (nom, ville, coordonnées).
// Les DECIMAL reviennent sous forme de chaînes ; on force Number pour que le
// front (Leaflet) puisse positionner les marqueurs sans reconversion.
async function getDealers(_req, res) {
  try {
    const dealers = await prisma.dealers.findMany({
      orderBy: { city: 'asc' },
      select: { id: true, name: true, city: true, latitude: true, longitude: true },
    })
    res.json(
      dealers.map((d) => ({
        ...d,
        latitude: Number(d.latitude),
        longitude: Number(d.longitude),
      })),
    )
  } catch (err) {
    console.error('[dealers] Erreur GET /api/dealers :', err)
    res.status(500).json({ error: 'Unable to load dealers.' })
  }
}

module.exports = { getDealers }