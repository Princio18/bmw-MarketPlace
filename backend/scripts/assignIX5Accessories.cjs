// Rattache les accessoires actifs au BMW iX5 (SUV, electric) uniquement.
//
// Idempotent : ré-exécutable sans doublon (ON CONFLICT DO NOTHING). Ne touche
// aucun autre véhicule : les autres modèles n'ont donc aucun accessoire.

const { prisma } = require('../src/db')

const IX5_ID = 'd65be110-23d8-4ff1-b52b-d976f16a8bfb'

async function main() {
  const vehicle = await prisma.vehicles.findFirst({
    where: { id: IX5_ID, deleted_at: null },
    select: { id: true, model_name: true, drivetrain: true },
  })
  if (!vehicle) {
    console.error(`Véhicule iX5 introuvable (id ${IX5_ID}).`)
    process.exit(1)
  }

  const accessories = await prisma.accessories.findMany({
    where: { deleted_at: null },
    select: { id: true, name: true },
  })
  if (accessories.length === 0) {
    console.error('Aucun accessoire actif en base.')
    process.exit(1)
  }

  for (const accessory of accessories) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO vehicle_accessories (vehicle_id, accessory_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      vehicle.id,
      accessory.id,
    )
  }

  console.log(
    `${accessories.length} accessoire(s) rattachés au BMW iX5 (${vehicle.model_name}, ${vehicle.drivetrain}).`,
  )
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})