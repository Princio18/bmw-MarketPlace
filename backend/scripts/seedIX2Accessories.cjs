require('dotenv').config()

const { closeDb, prisma } = require('../src/db')

// Accessoires du BMW iX2.
// Idempotent par `name` : relancer le script ne duplique rien, il met a jour
// prix / stock / description. Les 4 fiches sont ensuite rattachees UNIQUEMENT
// a l'iX2 (idempotent via ON CONFLICT DO NOTHING).
// « Panoramic Glass Sunroof (iX2) » est volontairement distinct de la fiche
// homonyme de l'iX1 afin que chaque vehicule garde sa propre image.
const VEHICLE_ID = '84996e09-e814-4968-9925-8d17014d4529'

const ACCESSORIES = [
  {
    name: '20-inch M light-alloy wheels',
    description: '20-inch M light-alloy wheels in a sporty double-spoke design.',
    price: 1500,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'Panoramic Glass Sunroof (iX2)',
    description: 'Panoramic glass sunroof with electric tilt and slide.',
    price: 1200,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'Steering Wheel Heating',
    description: 'Heated steering wheel with three temperature levels.',
    price: 350,
    stockQuantity: 8,
    badge: 'For you',
  },
  {
    name: 'Technology Pack',
    description:
      'Technology Pack bundling navigation, head-up display and connected services.',
    price: 1300,
    stockQuantity: 6,
    badge: 'For you',
  },
]

async function run() {
  const vehicle = await prisma.vehicles.findFirst({
    where: { id: VEHICLE_ID, deleted_at: null },
    select: { id: true, model_name: true, drivetrain: true },
  })
  if (!vehicle) {
    console.error(`Vehicule BMW iX2 introuvable (id ${VEHICLE_ID}).`)
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
    `[seed:ix2] ${accessoryIds.length} accessoire(s) rattaches a ${vehicle.model_name} (${vehicle.drivetrain}).`,
  )
  console.log(
    `[seed:ix2] Resume : inseres ${inserted}, mis a jour ${updated}, total attendu ${ACCESSORIES.length}.`,
  )
}

run()
  .then(async () => {
    await closeDb()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('[seed:ix2] Erreur inattendue.', err)
    await closeDb()
    process.exit(1)
  })