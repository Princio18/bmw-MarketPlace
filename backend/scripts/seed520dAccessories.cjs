require('dotenv').config()

const { closeDb, prisma } = require('../src/db')

// Accessoires de la BMW 520d.
// Idempotent par `name` : relancer le script ne duplique rien, il met a jour
// prix / stock / description. Les 12 fiches sont ensuite rattachees UNIQUEMENT
// a la 520d (idempotent via ON CONFLICT DO NOTHING).
const VEHICLE_ID = '7e08203d-a7f9-466d-b507-4ceae46dde8a'

const ACCESSORIES = [
  {
    name: 'Ambient Interior Cabin Lighting',
    description:
      'Multi-colour ambient lighting for doors, footwells and instrument panel.',
    price: 450,
    stockQuantity: 10,
    badge: 'For you',
  },
  {
    name: 'Dakota Leather or Nappa Leather Upholstery in Various Colors',
    description:
      'Dakota leather or Nappa leather upholstery in a range of colours.',
    price: 1800,
    stockQuantity: 6,
    badge: 'For you',
  },
  {
    name: 'Electric Glass Sunroof',
    description: 'Panoramic electric glass sunroof with one-touch operation.',
    price: 1400,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'Heated Front and Rear Seats',
    description: 'Heated front and rear seats with three temperature levels.',
    price: 550,
    stockQuantity: 8,
    badge: 'For you',
  },
  {
    name: 'Icon Adaptive LED Headlights',
    description: 'BMW Icon Adaptive LED headlights with selective beam.',
    price: 1200,
    stockQuantity: 6,
    badge: 'For you',
  },
  {
    name: 'Lane Departure Warning Systems',
    description: 'Lane departure warning with steering intervention.',
    price: 900,
    stockQuantity: 7,
    badge: 'For you',
  },
  {
    name: 'Larger Alloy Wheels',
    description: 'Upgraded larger alloy wheels in a sportier design.',
    price: 1600,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'Metallic Exterior Paint Finishes',
    description: 'Metallic exterior paint finish in a choice of colours.',
    price: 950,
    stockQuantity: 9,
    badge: 'For you',
  },
  {
    name: 'Reversing Camera and 360-degree Parking Assistants',
    description:
      'Reversing camera with 360-degree surround parking assistance.',
    price: 1100,
    stockQuantity: 6,
    badge: 'For you',
  },
  {
    name: 'Sun Protection Glazing',
    description: 'Sun protection glazing with heat-insulating glass.',
    price: 400,
    stockQuantity: 10,
    badge: 'For you',
  },
  {
    name: 'Thin Rear Boot Spoilers',
    description: 'Thin rear boot spoiler for a sportier rear profile.',
    price: 350,
    stockQuantity: 8,
    badge: 'For you',
  },
  {
    name: 'Upgraded Navigation Displays and Digital Instrument Clusters',
    description: 'Upgraded navigation display with digital instrument cluster.',
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
    console.error(`Vehicule BMW 520d introuvable (id ${VEHICLE_ID}).`)
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
    `[seed:520d] ${accessoryIds.length} accessoire(s) rattaches a ${vehicle.model_name} (${vehicle.drivetrain}).`,
  )
  console.log(
    `[seed:520d] Resume : inseres ${inserted}, mis a jour ${updated}, total attendu ${ACCESSORIES.length}.`,
  )
}

run()
  .then(async () => {
    await closeDb()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('[seed:520d] Erreur inattendue.', err)
    await closeDb()
    process.exit(1)
  })