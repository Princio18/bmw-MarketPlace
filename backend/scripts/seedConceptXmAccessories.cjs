require('dotenv').config()

const { closeDb, prisma } = require('../src/db')

// Accessoires de la BMW Concept XM.
// Idempotent par `name` : relancer le script ne duplique rien, il met a jour
// prix / stock / description. Les 4 fiches sont ensuite rattachees UNIQUEMENT
// a la Concept XM (idempotent via ON CONFLICT DO NOTHING).
const VEHICLE_ID = 'd86f856c-48d6-4e77-ba85-9e464b03dd69'

const ACCESSORIES = [
  {
    name: 'Cockpit and Controls',
    description:
      'Driver-focused cockpit with curved display and M-specific controls.',
    price: 3500,
    stockQuantity: 4,
    badge: 'For you',
  },
  {
    name: 'Exterior & Aerodynamics',
    description:
      'Aerodynamic body kit with carbon details and M rear diffuser.',
    price: 5000,
    stockQuantity: 4,
    badge: 'For you',
  },
  {
    name: 'Interior Seating and Materials',
    description:
      'Sculptural seating with premium materials and M-specific trim.',
    price: 6800,
    stockQuantity: 3,
    badge: 'For you',
  },
  {
    name: 'Powertrain Tech',
    description:
      'High-voltage powertrain upgrade with boosted performance mapping.',
    price: 7500,
    stockQuantity: 3,
    badge: 'For you',
  },
]

async function run() {
  const vehicle = await prisma.vehicles.findFirst({
    where: { id: VEHICLE_ID, deleted_at: null },
    select: { id: true, model_name: true, drivetrain: true },
  })
  if (!vehicle) {
    console.error(`Vehicule Concept XM introuvable (id ${VEHICLE_ID}).`)
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
    `[seed:xm] ${accessoryIds.length} accessoire(s) rattaches a ${vehicle.model_name} (${vehicle.drivetrain}).`,
  )
  console.log(
    `[seed:xm] Resume : inseres ${inserted}, mis a jour ${updated}, total attendu ${ACCESSORIES.length}.`,
  )
}

run()
  .then(async () => {
    await closeDb()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('[seed:xm] Erreur inattendue.', err)
    await closeDb()
    process.exit(1)
  })