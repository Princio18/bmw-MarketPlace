require('dotenv').config()

const { closeDb, prisma } = require('../src/db')

// Accessoires du BMW iX3.
// Idempotent par `name` : relancer le script ne duplique rien, il met a jour
// prix / stock / description. Les 11 fiches sont ensuite rattachees UNIQUEMENT
// a l'iX3 (idempotent via ON CONFLICT DO NOTHING).
// « Driving Assistant Professional (iX3) » et « Wheels (iX3) » sont volontairement
// distincts des fiches homonymes existantes afin que chaque vehicule garde sa
// propre image (meme motif que « Panoramic Glass Sunroof (iX2) »).
const VEHICLE_ID = '83a9fd7e-30e1-4208-a42a-274af9d3a6d1'

const ACCESSORIES = [
  {
    name: '3D Head-up Display',
    description: '3D head-up display with augmented reality navigation.',
    price: 1100,
    stockQuantity: 6,
    badge: 'For you',
  },
  {
    name: 'Digital Key Plus',
    description: 'Digital Key Plus with ultra-wideband access from your smartphone.',
    price: 350,
    stockQuantity: 10,
    badge: 'For you',
  },
  {
    name: 'Driving Assistant Professional (iX3)',
    description:
      'Driving Assistant Professional with lane keeping and adaptive cruise.',
    price: 1500,
    stockQuantity: 6,
    badge: 'For you',
  },
  {
    name: 'Harman Kardon Surround Sound System (iX3)',
    description: 'Harman Kardon surround sound system with premium acoustics.',
    price: 750,
    stockQuantity: 6,
    badge: 'For you',
  },
  {
    name: 'Partition Net',
    description: 'Load compartment partition net for safe transport.',
    price: 500,
    stockQuantity: 7,
    badge: 'For you',
  },
  {
    name: 'Roof',
    description: 'Panoramic glass roof with electric operation.',
    price: 1400,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'Three-Zone Climate Control',
    description: 'Three-zone automatic climate control with rear console.',
    price: 600,
    stockQuantity: 8,
    badge: 'For you',
  },
  {
    name: 'Towing',
    description: 'Factory-fitted tow bar with electrical interface.',
    price: 950,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'Universal Garage-Door Opener',
    description:
      'Universal garage-door opener integrated into the interior mirror.',
    price: 450,
    stockQuantity: 8,
    badge: 'For you',
  },
  {
    name: 'Upholstery & Seating',
    description: 'Premium upholstery and seating package.',
    price: 2400,
    stockQuantity: 4,
    badge: 'For you',
  },
  {
    name: 'Wheels (iX3)',
    description: 'Upgraded alloy wheels in a sporty design.',
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
    console.error(`Vehicule iX3 introuvable (id ${VEHICLE_ID}).`)
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
    `[seed:ix3] ${accessoryIds.length} accessoire(s) rattaches a ${vehicle.model_name} (${vehicle.drivetrain}).`,
  )
  console.log(
    `[seed:ix3] Resume : inseres ${inserted}, mis a jour ${updated}, total attendu ${ACCESSORIES.length}.`,
  )
}

run()
  .then(async () => {
    await closeDb()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('[seed:ix3] Erreur inattendue.', err)
    await closeDb()
    process.exit(1)
  })