require('dotenv').config()

const { closeDb, prisma } = require('../src/db')

// Accessoires de la BMW iX M Model (M Performance).
// Idempotent par `name` : relancer le script ne duplique rien, il met a jour
// prix / stock / description. Les 8 fiches sont ensuite rattachees UNIQUEMENT
// a l'iX M Model (idempotent via ON CONFLICT DO NOTHING).
const VEHICLE_ID = '10227abf-c272-44a6-b3a5-15233d2dfa39'

const ACCESSORIES = [
  {
    name: '23-inch M Light-Alloy Wheels',
    description: '23-inch M light-alloy wheels in an aerodynamic design.',
    price: 2500,
    stockQuantity: 4,
    badge: 'For you',
  },
  {
    name: 'BMW Iconic Glow Kidney Grille',
    description: 'Illuminated BMW Iconic Glow kidney grille.',
    price: 2200,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'BMW Individual Exterior Paint Finishes',
    description: 'BMW Individual exterior paint finishes in exclusive shades.',
    price: 3200,
    stockQuantity: 4,
    badge: 'For you',
  },
  {
    name: 'Bowers & Wilkins Diamond Surround Sound System',
    description:
      'Bowers & Wilkins Diamond surround sound system with 30 speakers.',
    price: 4800,
    stockQuantity: 3,
    badge: 'For you',
  },
  {
    name: 'Executive Package',
    description: 'Executive Package with rear comfort seats, heating and massage.',
    price: 5600,
    stockQuantity: 3,
    badge: 'For you',
  },
  {
    name: 'Interior Design Worlds',
    description: 'Interior Design Worlds with curated material combinations.',
    price: 2800,
    stockQuantity: 4,
    badge: 'For you',
  },
  {
    name: 'M Multifunction Seats',
    description: 'M multifunction seats with heating, ventilation and massage.',
    price: 3900,
    stockQuantity: 4,
    badge: 'For you',
  },
  {
    name: 'Sky Lounge Panoramic Glass Roof',
    description: 'Sky Lounge panoramic glass roof with electrochromic shading.',
    price: 1900,
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
    console.error(`Vehicule iX M Model introuvable (id ${VEHICLE_ID}).`)
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
    `[seed:ixm] ${accessoryIds.length} accessoire(s) rattaches a ${vehicle.model_name} (${vehicle.drivetrain}).`,
  )
  console.log(
    `[seed:ixm] Resume : inseres ${inserted}, mis a jour ${updated}, total attendu ${ACCESSORIES.length}.`,
  )
}

run()
  .then(async () => {
    await closeDb()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('[seed:ixm] Erreur inattendue.', err)
    await closeDb()
    process.exit(1)
  })