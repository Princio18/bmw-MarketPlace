require('dotenv').config()
const { closeDb, prisma } = require('../src/db')

// Concessionnaires fictifs plausibles, un par ville. Nom + coordonnées
// approximatives réelles — consommés par GET /api/dealers (DealerMapPicker).
const DEALERS = [
  { name: 'BMW Centre London', city: 'London', latitude: 51.5074, longitude: -0.1278 },
  { name: 'BMW Centre Manchester', city: 'Manchester', latitude: 53.4808, longitude: -2.2426 },
  { name: 'BMW Centre Birmingham', city: 'Birmingham', latitude: 52.4862, longitude: -1.8904 },
  { name: 'BMW Centre Glasgow', city: 'Glasgow', latitude: 55.8642, longitude: -4.2518 },
  { name: 'BMW Centre Edinburgh', city: 'Edinburgh', latitude: 55.9533, longitude: -3.1883 },
  { name: 'BMW Centre Leeds', city: 'Leeds', latitude: 53.8008, longitude: -1.5491 },
  { name: 'BMW Centre Liverpool', city: 'Liverpool', latitude: 53.4084, longitude: -2.9916 },
  { name: 'BMW Centre Bristol', city: 'Bristol', latitude: 51.4545, longitude: -2.5879 },
  { name: 'BMW Centre Cardiff', city: 'Cardiff', latitude: 51.4816, longitude: -3.1791 },
  { name: 'BMW Centre Newcastle', city: 'Newcastle', latitude: 54.9783, longitude: -1.6178 },
  { name: 'BMW Centre Sheffield', city: 'Sheffield', latitude: 53.3811, longitude: -1.4701 },
  { name: 'BMW Centre Nottingham', city: 'Nottingham', latitude: 52.9548, longitude: -1.1581 },
  { name: 'BMW Centre Southampton', city: 'Southampton', latitude: 50.9097, longitude: -1.4044 },
  { name: 'BMW Centre Plymouth', city: 'Plymouth', latitude: 50.3755, longitude: -4.1427 },
  { name: 'BMW Centre Swansea', city: 'Swansea', latitude: 51.6214, longitude: -3.9436 },
  { name: 'BMW Centre Belfast', city: 'Belfast', latitude: 54.5973, longitude: -5.9301 },
  { name: 'BMW Centre Dublin', city: 'Dublin', latitude: 53.3498, longitude: -6.2603 },
]

async function run() {
  const count = await prisma.dealers.count()
  if (count > 0) {
    console.log(`[seed:dealers] ${count} concessionnaire(s) déjà présent(s), aucune action effectuée.`)
    return 0
  }

  const existing = await prisma.dealers.findMany({ select: { name: true } })
  const existingNames = new Set(existing.map((d) => d.name))
  const toCreate = DEALERS.filter((d) => !existingNames.has(d.name))

  if (toCreate.length === 0) {
    console.log('[seed:dealers] Aucun nouveau concessionnaire à insérer (vérification par nom).')
    return 0
  }

  const result = await prisma.dealers.createMany({ data: toCreate })
  console.log(`[seed:dealers] ${result.count} concessionnaire(s) créé(s) (${toCreate.length} villes).`)
  return 0
}

run()
  .then(async (code) => {
    await closeDb()
    process.exit(code)
  })
  .catch(async (err) => {
    console.error('[seed:dealers] Erreur inattendue :', err)
    try {
      await closeDb()
    } catch {
      // client déjà fermé
    }
    process.exit(1)
  })