require('dotenv').config()

const { closeDb, prisma } = require('../src/db')

// Accessoires du BMW iX1.
// Idempotent par `name` : relancer le script ne duplique rien, il met a jour
// prix / stock / description. Les 9 fiches sont ensuite rattachees UNIQUEMENT
// a l'iX1 (idempotent via ON CONFLICT DO NOTHING).
// « Driving Assistant Professional (iX1) » est volontairement distinct de la
// fiche homonyme de la 330e afin que chaque vehicule garde sa propre image.
const VEHICLE_ID = '7f23a3f2-b142-49a9-9b3f-7ab86989cec8'

const ACCESSORIES = [
  {
    name: 'Ambient Lighting',
    description: 'Multi-colour ambient interior lighting with selectable profiles.',
    price: 400,
    stockQuantity: 10,
    badge: 'For you',
  },
  {
    name: 'BMW Digital Key Plus',
    description: 'Digital Key Plus with ultra-wideband access from your smartphone.',
    price: 350,
    stockQuantity: 12,
    badge: 'For you',
  },
  {
    name: 'BMW Wallbox',
    description: 'BMW Wallbox home charging unit with integrated cable management.',
    price: 900,
    stockQuantity: 6,
    badge: 'For you',
  },
  {
    name: 'Driving Assistant Professional (iX1)',
    description:
      'Driving Assistant Professional with lane keeping and adaptive cruise.',
    price: 1500,
    stockQuantity: 6,
    badge: 'For you',
  },
  {
    name: 'Flexible Fast Charger',
    description: 'Flexible fast charger for convenient charging at any outlet.',
    price: 300,
    stockQuantity: 10,
    badge: 'For you',
  },
  {
    name: 'Harman Kardon Sound System',
    description: 'Harman Kardon premium surround sound system.',
    price: 700,
    stockQuantity: 6,
    badge: 'For you',
  },
  {
    name: 'Leather Upholstery',
    description: 'Leather upholstery with contrast stitching.',
    price: 1600,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'Panoramic Glass Sunroof',
    description: 'Panoramic glass sunroof with electric tilt and slide.',
    price: 1200,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'Retractable Trailer Tow Hitch',
    description: 'Electrically retractable trailer tow hitch.',
    price: 850,
    stockQuantity: 5,
    badge: 'For you',
  },
]

async function run() {
  const vehicle = await prisma.vehicles.findFirst({
    where: { id: VEHICLE_ID, deleted_at: null },
    select: { id: true, model_name: true, drivetrain: true },
  })
  if (!vehicle) {
    console.error(`Vehicule BMW iX1 introuvable (id ${VEHICLE_ID}).`)
    process.exit(1)
  }

  let inserted = 0
  let updated = 0
  const accessoryIds = []

  for (const accessory of ACCESSORIES) {
    const data = {
      description: accessory.description,
      price: accessory.price,
      stock_quantity: accessory.stockQuantity,
      badge: accessory.badge ?? null,
      requires_adjustment: Boolean(accessory.requiresAdjustment),
    }

    const existing = await prisma.accessories.findFirst({
      where: { name: accessory.name },
      select: { id: true },
    })

    if (existing) {
      await prisma.accessories.update({
        where: { id: existing.id },
        data: { ...data, deleted_at: null },
      })
      accessoryIds.push(existing.id)
      updated += 1
      continue
    }

    const created = await prisma.accessories.create({
      data: { name: accessory.name, ...data },
      select: { id: true },
    })
    accessoryIds.push(created.id)
    inserted += 1
  }

  for (const accessoryId of accessoryIds) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO vehicle_accessories (vehicle_id, accessory_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      vehicle.id,
      accessoryId,
    )
  }

  console.log(
    `[seed:ix1] ${accessoryIds.length} accessoire(s) rattaches a ${vehicle.model_name} (${vehicle.drivetrain}).`,
  )
  console.log(
    `[seed:ix1] Resume : inseres ${inserted}, mis a jour ${updated}, total attendu ${ACCESSORIES.length}.`,
  )
}

run()
  .then(async () => {
    await closeDb()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('[seed:ix1] Erreur inattendue.', err)
    await closeDb()
    process.exit(1)
  })