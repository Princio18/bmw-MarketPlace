require('dotenv').config()

const { closeDb, prisma } = require('../src/db')

// Accessoires de la BMW M340i.
// Idempotent par `name` : relancer le script ne duplique rien, il met a jour
// prix / stock / description. Les 5 fiches sont ensuite rattachees UNIQUEMENT
// a la M340i (idempotent via ON CONFLICT DO NOTHING).
const VEHICLE_ID = '98ed13f9-85a9-4c15-a75f-65cce1e77d05'

const ACCESSORIES = [
  {
    name: 'Adaptive M Suspension',
    description: 'Adaptive M suspension with electronically controlled dampers.',
    price: 1400,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'Harman Kardon Surround Sound System',
    description: 'Harman Kardon surround sound system with premium speakers.',
    price: 850,
    stockQuantity: 6,
    badge: 'For you',
  },
  {
    name: 'Interior Trim Upgrades',
    description: 'Upgraded interior trim in aluminium or carbon fibre.',
    price: 700,
    stockQuantity: 7,
    badge: 'For you',
  },
  {
    name: 'M Performance Exhaust',
    description: 'M Performance exhaust system with sporty sound.',
    price: 1900,
    stockQuantity: 4,
    badge: 'For you',
  },
  {
    name: 'Upgraded Wheels',
    description: 'Upgraded alloy wheels in an M-specific design.',
    price: 1600,
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
    console.error(`Vehicule BMW M340i introuvable (id ${VEHICLE_ID}).`)
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
    `[seed:m340i] ${accessoryIds.length} accessoire(s) rattaches a ${vehicle.model_name} (${vehicle.drivetrain}).`,
  )
  console.log(
    `[seed:m340i] Resume : inseres ${inserted}, mis a jour ${updated}, total attendu ${ACCESSORIES.length}.`,
  )
}

run()
  .then(async () => {
    await closeDb()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('[seed:m340i] Erreur inattendue.', err)
    await closeDb()
    process.exit(1)
  })