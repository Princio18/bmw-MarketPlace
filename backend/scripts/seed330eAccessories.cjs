require('dotenv').config()

const { closeDb, prisma } = require('../src/db')

// Accessoires de la BMW 330e.
// Idempotent par `name` : relancer le script ne duplique rien, il met a jour
// prix / stock / description. Les 6 fiches sont ensuite rattachees UNIQUEMENT
// a la 330e (idempotent via ON CONFLICT DO NOTHING).
// « Adaptive M Suspension (330e) » est volontairement distinct de la fiche
// homonyme de la M340i afin que chaque vehicule garde sa propre image.
const VEHICLE_ID = '58995387-7a15-4494-b8e2-88c8ffd99868'

const ACCESSORIES = [
  {
    name: '360-Degree Camera',
    description: '360-degree camera with surround view and parking assistance.',
    price: 900,
    stockQuantity: 7,
    badge: 'For you',
  },
  {
    name: 'Adaptive M Suspension (330e)',
    description: 'Adaptive M suspension with electronically controlled dampers.',
    price: 1400,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'Driving Assistant Professional',
    description:
      'Driving Assistant Professional with lane keeping and adaptive cruise.',
    price: 1500,
    stockQuantity: 6,
    badge: 'For you',
  },
  {
    name: 'Glass Moonroof',
    description: 'Electric glass moonroof with tilt and slide.',
    price: 1200,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'Head-Up Display (HUD)',
    description: 'Head-up display projecting key driving information.',
    price: 800,
    stockQuantity: 8,
    badge: 'For you',
  },
  {
    name: 'M Sports Brake System',
    description: 'M Sport brake system with blue calipers.',
    price: 1100,
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
    console.error(`Vehicule BMW 330e introuvable (id ${VEHICLE_ID}).`)
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
    `[seed:330e] ${accessoryIds.length} accessoire(s) rattaches a ${vehicle.model_name} (${vehicle.drivetrain}).`,
  )
  console.log(
    `[seed:330e] Resume : inseres ${inserted}, mis a jour ${updated}, total attendu ${ACCESSORIES.length}.`,
  )
}

run()
  .then(async () => {
    await closeDb()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('[seed:330e] Erreur inattendue.', err)
    await closeDb()
    process.exit(1)
  })