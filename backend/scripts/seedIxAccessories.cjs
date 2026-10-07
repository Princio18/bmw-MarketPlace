require('dotenv').config()

const { closeDb, prisma } = require('../src/db')

// Accessoires du BMW iX (standard).
// Idempotent par `name` : relancer le script ne duplique rien, il met a jour
// prix / stock / description. Les 5 fiches sont ensuite rattachees UNIQUEMENT
// a l'iX (idempotent via ON CONFLICT DO NOTHING).
const VEHICLE_ID = 'ade66830-3675-4548-b940-ce2ffcfd7f65'

const ACCESSORIES = [
  {
    name: 'Audio & Technology',
    description:
      'Audio & Technology pack with premium sound and connected services.',
    price: 1800,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'Dynamic Handling Package',
    description:
      'Dynamic Handling Package with adaptive suspension and rear-axle steering.',
    price: 2600,
    stockQuantity: 4,
    badge: 'For you',
  },
  {
    name: 'Suspension & Steering',
    description: 'Adaptive suspension and variable sport steering.',
    price: 1500,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'Upholstery & Interior',
    description: 'Premium upholstery and interior trim package.',
    price: 2900,
    stockQuantity: 4,
    badge: 'For you',
  },
  {
    name: 'Wheels',
    description: 'Upgraded alloy wheels in a sporty design.',
    price: 1700,
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
    console.error(`Vehicule iX introuvable (id ${VEHICLE_ID}).`)
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
    `[seed:ix] ${accessoryIds.length} accessoire(s) rattaches a ${vehicle.model_name} (${vehicle.drivetrain}).`,
  )
  console.log(
    `[seed:ix] Resume : inseres ${inserted}, mis a jour ${updated}, total attendu ${ACCESSORIES.length}.`,
  )
}

run()
  .then(async () => {
    await closeDb()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('[seed:ix] Erreur inattendue.', err)
    await closeDb()
    process.exit(1)
  })