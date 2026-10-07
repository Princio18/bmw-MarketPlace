require('dotenv').config()

const { closeDb, prisma } = require('../src/db')

// Accessoires de la BMW 7 Series Protection.
// Idempotent par `name` : relancer le script ne duplique rien, il met a jour
// prix / stock / description. Les 9 fiches sont ensuite rattachees UNIQUEMENT
// a la 7 Series Protection (idempotent via ON CONFLICT DO NOTHING).
const VEHICLE_ID = '4ecc103e-9e48-49d2-8d7a-574fc9847b2f'

const ACCESSORIES = [
  {
    name: 'Bulletproof System',
    description:
      'Ballistic protection package with armored glass, reinforced body panels and underbody shielding.',
    price: 18500,
    stockQuantity: 2,
    badge: 'For you',
  },
  {
    name: 'Executive Lounge Seating',
    description:
      'Rear executive lounge seats with massage, heating and a central control console.',
    price: 6200,
    stockQuantity: 4,
    badge: 'For you',
  },
  {
    name: 'Fire Extinguisher System',
    description: 'Automatic fire suppression system with engine-bay nozzles.',
    price: 950,
    stockQuantity: 6,
    badge: 'For you',
  },
  {
    name: 'Flag Poles',
    description:
      'Pair of retractable stainless-steel flag poles mounted on the front fenders.',
    price: 780,
    stockQuantity: 8,
    badge: 'For you',
  },
  {
    name: 'Flashing Lights & Beacons',
    description:
      'Front grille LED flashing lights and roof beacon for convoy operations.',
    price: 1450,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'Fresh-Air Supply System',
    description: 'Onboard fresh-air supply for occupants in a sealed cabin.',
    price: 2300,
    stockQuantity: 3,
    badge: 'For you',
  },
  {
    name: 'Iconic Glow Crystal Headlights',
    description: 'Crystal headlights with illuminated kidney grille.',
    price: 3400,
    stockQuantity: 4,
    badge: 'For you',
  },
  {
    name: 'Intercom System',
    description: 'Two-way intercom between occupants and the exterior.',
    price: 1700,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'Security Satellite Phone',
    description: 'Encrypted satellite communication unit with concealed antenna.',
    price: 4100,
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
    console.error(`Vehicule 7 Series Protection introuvable (id ${VEHICLE_ID}).`)
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
    `[seed:protection] ${accessoryIds.length} accessoire(s) rattaches a ${vehicle.model_name} (${vehicle.drivetrain}).`,
  )
  console.log(
    `[seed:protection] Resume : inseres ${inserted}, mis a jour ${updated}, total attendu ${ACCESSORIES.length}.`,
  )
}

run()
  .then(async () => {
    await closeDb()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('[seed:protection] Erreur inattendue.', err)
    await closeDb()
    process.exit(1)
  })