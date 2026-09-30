require('dotenv').config()

const { closeDb, prisma } = require('../src/db')

// Accessoires de démonstration vendus en plus du véhicule.
// Idempotent par `name` : relancer le script ne duplique rien, il met à jour
// prix / stock / description. Aucune image n'est fournie ici (image_data NULL) :
// l'espace admin (/admin/accessories) les téléverse via le formulaire.
//
// `Roof Rails` est volontairement à 0 en stock pour pouvoir tester l'état
// "Out of stock" et le refus de paiement côté serveur.
const ACCESSORIES = [
  {
    name: '21" M Performance Alloy Wheels',
    description:
      '21" M Performance forged wheels in Y-spoke design, upgrade the stance of your BMW and sharpen its road presence.',
    price: 1800,
    stockQuantity: 5,
    badge: 'For you',
  },
  {
    name: 'M Sport Steering Wheel',
    description:
      'M Sport leather steering wheel with thick rim and multifunction controls for a driver-focused cockpit.',
    price: 450,
    stockQuantity: 8,
    badge: 'For you',
  },
  {
    name: 'Roof Rails',
    description:
      'Roof rails in matt black, designed to carry roof boxes, roof boxes and further accessory equipment.',
    price: 220,
    stockQuantity: 0,
    badge: 'For you',
  },
  {
    name: 'Illuminated Door Sills',
    description:
      'LED door sills projected on the ground when the doors are opened, with BMW M logo.',
    price: 180,
    stockQuantity: 12,
    badge: 'For you',
  },
  {
    name: 'Tow Bar',
    description:
      'Removable tow bar for a trailer up to 1,800 kg. Requires a minimum towing power of 750 kg and is type-approved.',
    price: 650,
    stockQuantity: 3,
    badge: 'For you',
    requiresAdjustment: true,
  },
  {
    name: 'All-Weather Floor Mats',
    description:
      'Custom-fit all-weather floor mats in a high-quality velour finish, protecting the sills from water and dirt all year round.',
    price: 120,
    stockQuantity: 20,
    badge: null,
  },
]

async function run() {
  let inserted = 0
  let updated = 0

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
      select: { id: true, deleted_at: true },
    })

    if (existing) {
      // Un accessory soft-deleted puis re-seedé redevient actif.
      await prisma.accessories.update({
        where: { id: existing.id },
        data: { ...data, deleted_at: null },
      })
      updated += 1
      continue
    }

    await prisma.accessories.create({
      data: { name: accessory.name, ...data },
    })
    inserted += 1
  }

  console.log(
    `[seed:accessories] Résumé : accessoires insérés ${inserted}, mis à jour ${updated}, total attendu ${ACCESSORIES.length}.`,
  )
  console.log(
    '[seed:accessories] Aucune image fournie (image_data NULL) — l\'endpoint /api/accessories/:id/image redirigera vers le placeholder.',
  )
}

run()
  .then(async () => {
    await closeDb()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('[seed:accessories] Erreur inattendue :', err)
    try {
      await closeDb()
    } catch {
      // client déjà fermé
    }
    process.exit(1)
  })
