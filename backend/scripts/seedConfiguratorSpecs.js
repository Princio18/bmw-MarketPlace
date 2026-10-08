require('dotenv').config()

const { closeDb, prisma } = require('../src/db')
const technicalDataByVehicle = require('./vehicleTechnicalData')
const { buildKeySpecs, buildEngineCard } = require('./deriveConfiguratorCards')

// Résout le slug catalogue d'un véhicule pour retrouver ses données
// techniques dans vehicleTechnicalData.js.
function resolveSlug(vehicle) {
  const name = vehicle.model_name.replace(/^BMW\s+/i, '').toLowerCase().trim()
  if (name === 'ix3' && vehicle.is_m_performance) return 'ix3-m-performance'
  const map = {
    'm340i': 'm340i',
    '520d': '520d',
    '7 series protection': '7-series-protection',
    'concept xm': 'concept-xm',
    '330e': '330e',
    'ix1': 'ix1',
    'ix2': 'ix2',
    'ix3': 'ix3',
    'ix5': 'ix5',
    'ix': 'ix',
  }
  return map[name] || null
}

// Specs du configurateur ("Build & Price"). Injectées sur un véhicule
// électrique déjà seedé pour alimenter la page /configure/:vehicleId.
// La forme de ce JSON est volontairement figée par le frontend.
const CONFIGURATOR_SPECS = {
  keySpecs: {
    electricRange: '321 miles',
    energyConsumption: '3.5 mi/kWh',
    minChargeTimeDC: '0:30 h',
  },
  technicalData: {
    engine: {
      performance: '442 kW (601 hp)',
      torque: '795 Nm',
      fuelType: 'Electric',
      transmission: 'Automatic',
      topSpeed: '143 mph',
    },
    consumption: {
      wltpEnergyConsumption: '3.3 mi/kWh',
      wltpCO2: '0 g/km',
      passByNoise: '67 db(A)*',
    },
    electricRange: {
      wltpRange: '300 miles',
      batterySizeGross: '88.5 kWh',
      batterySizeNet: '81.2 kWh',
      chargingTimeAC: '4:15 h',
      maxChargingAC: '22 kW',
      chargingTimeDC: '0:30 h',
      maxChargingDC: '205 kW',
      addedRange10Min: '89 – 106 miles',
    },
    performanceWeight: {
      unladenWeight: '2425 kg',
      axleLoad: '1430 kg / 1700 kg',
      acceleration: '3.9 s',
      permittedLoad: '2960 kg',
      payload: '610 kg',
      maxTrailerLoad: '2000 kg / 80 kg',
      trailerLoadUnbraked: '750 kg',
    },
    dimensions: {
      lengthWidthHeight: '5060 mm / 1900 mm / 1505 mm',
      widthMirrorsDriver: '2156 mm',
      widthMirrorsPassenger: '2156 mm',
      seats: 5,
      wheelbase: '2995 mm (11.9 m)',
      luggageCapacity: '570 – 1700 litre',
    },
  },
  standardEquipment: {
    exterior: [
      'LED headlights and LED rear lights',
      'Automatic tailgate operation',
    ],
    interior: [
      'BMW Live Cockpit Plus with BMW Curved Display',
      'BMW Operating System 8.5 with navigation',
      'BMW Interaction Bar, backlit',
      'BMW My Modes: PERSONAL, SPORT (incl. SPORT PLUS), EFFICIENT, EXPRESSIVE, RELAX',
      'Sport seats for driver and front passenger',
      'Automatic air conditioning with 2-zone control',
      'Wireless charging tray',
      'Through-loading system 40:20:40',
    ],
    driveSuspension: [
      'Steptronic automatic transmission with shift paddles',
      'Elevated driving dynamics and less steering effort thanks to a more direct steering ratio',
    ],
  },
  models: [
    {
      id: 'sport-edition',
      name: 'Sport Edition',
      priceFrom: 70045,
      image: '/images/vehicles/placeholder-exterior-grey.svg',
      note: null,
    },
    {
      id: 'm-sport',
      name: 'M Sport',
      priceFrom: 82575,
      image: '/images/vehicles/placeholder-exterior-black.svg',
      note: 'Selecting this option will change your engine',
    },
  ],
  engines: [
    {
      id: 'i5-m60',
      name: 'BMW i5 M60 xDrive Touring',
      priceFrom: 100095,
      badges: ['Electric', 'Automatic'],
      range: 'Up to 321 miles',
      rangeLabel: 'Electric range (WLTP)',
      enginePerformance: '442 kW (601 hp)',
      topSpeed: '143 mph',
      acceleration: '3.9 s',
    },
  ],
  exteriorColours: [
    {
      id: 'brooklyn-grey',
      name: 'Brooklyn Grey',
      code: 'E0',
      category: 'metallic',
      swatchColor: '#8a8d8f',
      image: '/images/vehicles/placeholder-exterior-grey.svg',
    },
    {
      id: 'alpine-white',
      name: 'Alpine White',
      code: '300',
      category: 'show-all',
      swatchColor: '#f2f2f2',
      image: '/images/vehicles/placeholder-exterior-white.svg',
    },
    {
      id: 'sapphire-black',
      name: 'Sapphire Black',
      code: '300',
      category: 'show-all',
      swatchColor: '#141518',
      image: '/images/vehicles/placeholder-exterior-black.svg',
    },
    {
      id: 'porta-rico-blue',
      name: 'Porta Rico Blue',
      code: '300',
      category: 'metallic',
      swatchColor: '#1c4f8f',
      image: '/images/vehicles/placeholder-exterior-blue.svg',
    },
    {
      id: 'imola-red',
      name: 'Imola Red',
      code: '405',
      category: 'metallic',
      swatchColor: '#9c1c22',
      image: '/images/vehicles/placeholder-exterior-red.svg',
    },
    {
      id: 'dark-green',
      name: 'Dark Green',
      code: '300',
      category: 'metallic',
      swatchColor: '#1f3d2b',
      image: '/images/vehicles/placeholder-exterior-green.svg',
    },
    {
      id: 'oxford-green',
      name: 'Oxford Green',
      code: '300',
      category: 'show-all',
      swatchColor: '#2c4a37',
      image: '/images/vehicles/placeholder-exterior-green.svg',
    },
    {
      id: 'individual-custom',
      name: 'BMW Individual',
      code: 'IND',
      category: 'bmw-individual',
      swatchColor: 'conic-gradient',
      image: '/images/vehicles/placeholder-exterior-custom.svg',
    },
  ],
  alloyWheels: [
    {
      id: 'wheel-21-954',
      name: '21" Individual aerodynamic wheels 954 Bicolour Jet Black',
      price: 1500,
      category: '21',
      thumbnail: '/images/wheels/954.svg',
      carImage: '/images/vehicles/placeholder-wheel-closeup-21.svg',
    },
    {
      id: 'wheel-21-1030',
      name: '21" Individual V-spoke wheels 1030 Bicolour Orbit Grey',
      price: 1895,
      category: '21',
      thumbnail: '/images/wheels/1030.svg',
      carImage: '/images/vehicles/placeholder-wheel-closeup-21.svg',
    },
    {
      id: 'wheel-20-19',
      name: '20" Individual V-spoke wheels 19',
      price: 1150,
      category: '20',
      thumbnail: '/images/wheels/19.svg',
      carImage: '/images/vehicles/placeholder-wheel-closeup-20.svg',
    },
    {
      id: 'wheel-20-18',
      name: '20" M double-spoke wheels 18 Bicolour',
      price: 0,
      category: '20',
      thumbnail: '/images/wheels/18.svg',
      carImage: '/images/vehicles/placeholder-wheel-closeup-20.svg',
    },
  ],
  upholstery: [
    {
      id: 'veganza-smoke-white',
      name: 'Perforated and Quilted Veganza in Smoke White',
      code: 'E0',
      category: 'leatherette',
      swatchColor: '#e8e4dc',
      image: '/images/vehicles/placeholder-seats-white.svg',
    },
    {
      id: 'veganza-coal-grey',
      name: 'Veganza in Coal Grey',
      code: 'A5',
      category: 'leatherette',
      swatchColor: '#8d8f93',
      image: '/images/vehicles/placeholder-seats-grey.svg',
    },
    {
      id: 'veganza-black',
      name: 'Veganza in Black',
      code: 'A7',
      category: 'leatherette',
      swatchColor: '#22252a',
      image: '/images/vehicles/placeholder-seats-black.svg',
    },
    {
      id: 'cloth-black',
      name: 'Cloth Material in Black',
      code: 'L7',
      category: 'cloth',
      swatchColor: '#2b2e33',
      image: '/images/vehicles/placeholder-seats-black.svg',
    },
    {
      id: 'cloth-stone-grey',
      name: 'Cloth Material in Stone Grey',
      code: 'L8',
      category: 'cloth',
      swatchColor: '#a4a29d',
      image: '/images/vehicles/placeholder-seats-grey.svg',
    },
    {
      id: 'merino-black',
      name: 'Merino leather in Black',
      code: 'L3',
      category: 'leather',
      swatchColor: '#1c1e21',
      image: '/images/vehicles/placeholder-seats-black.svg',
    },
    {
      id: 'merino-cognac',
      name: 'Merino leather in Cognac',
      code: 'L9',
      category: 'leather',
      swatchColor: '#6b4a2f',
      image: '/images/vehicles/placeholder-seats-brown.svg',
    },
    {
      id: 'individual-cashmere',
      name: 'BMW Individual Merino leather in Cashmere',
      code: 'IND',
      category: 'bmw-individual',
      swatchColor: '#e6dcc6',
      image: '/images/vehicles/placeholder-seats-cream.svg',
    },
  ],
  charging: [],
  financeOptions: [
    {
      id: 'pch',
      name: 'BMW Personal Contract Hire',
      description:
        'BMW Personal Contract Hire is a truly simple way to get into a new BMW.',
      type: 'rental',
      monthly: 1307.69,
    },
    {
      id: 'pcp',
      name: 'BMW Select (PCP)',
      description:
        'This product is perfect if you are looking to combine flexibility with low monthly payments.',
      type: 'rental',
      monthly: 1317.48,
    },
    {
      id: 'hp',
      name: 'BMW Hire Purchase',
      description:
        'Want to pay for your BMW until you end up owning it, BMW Hire Purchase could be for you.',
      type: 'payment',
      monthly: 1857.45,
    },
  ],
  vatRate: 0.2,
  onTheRoadFee: 1005,
}

async function run() {
  const targetId = (process.env.CONFIGURATOR_SPECS_VEHICLE_ID || '').trim()

  const vehicle = targetId
    ? await prisma.vehicles.findFirst({ where: { id: targetId } })
    : await prisma.vehicles.findFirst({
        where: { drivetrain: 'electric', deleted_at: null },
        orderBy: { created_at: 'asc' },
      })

  if (!vehicle) {
    console.error(
      targetId
        ? `[seed:configurator-specs] Véhicule introuvable pour l'id ${targetId}.`
        : '[seed:configurator-specs] Aucun véhicule électrique trouvé. Lancez npm run seed:vehicles d\'abord.',
    )
    process.exit(1)
  }

  const wasEmpty = !vehicle.specs

  await prisma.vehicles.update({
    where: { id: vehicle.id },
    data: { specs: CONFIGURATOR_SPECS, updated_at: new Date() },
  })

  console.log(
    `[seed:configurator-specs] Specs appliquées sur ${vehicle.model_name} / ${vehicle.variant_label} (id=${vehicle.id})${wasEmpty ? ' — colonne auparavant vide' : ''}.`,
  )
  console.log(
    `[seed:configurator-specs] ${CONFIGURATOR_SPECS.models.length} modèle(s), ${CONFIGURATOR_SPECS.financeOptions.length} option(s) de financement.`,
  )
  console.log(
    `[seed:configurator-specs] Options : ${CONFIGURATOR_SPECS.engines.length} moteur(s), ${CONFIGURATOR_SPECS.exteriorColours.length} couleur(s), ${CONFIGURATOR_SPECS.alloyWheels.length} jante(s), ${CONFIGURATOR_SPECS.upholstery.length} sellerie(s).`,
  )
  console.log(
    '[seed:configurator-specs] Les accessoires ne sont PAS dans ces specs : ils vivent en base (table accessories) et sont lus via GET /api/accessories.',
  )

  // Fusion des clés dérivées (technicalData, keySpecs, engines) pour tous les
  // véhicules du catalogue. jsonb_set imbriqué (create_missing=true) : seule
  // ces 3 clés sont écrites, les autres (standardEquipment, models, etc.) ne
  // sont jamais écrasées.
  const vehicles = await prisma.$queryRawUnsafe(
    'SELECT id, model_name, variant_label, is_m_performance, base_price FROM vehicles WHERE deleted_at IS NULL ORDER BY model_name',
  )

  let updated = 0
  let ignored = 0

  for (const vehicle of vehicles) {
    const slug = resolveSlug(vehicle)
    const specTech = slug ? technicalDataByVehicle[slug] : null

    if (!specTech) {
      ignored += 1
      console.log(`[seed:specs] Aucune donnée technique pour ${vehicle.model_name}, ignoré.`)
      continue
    }

    const keySpecs = buildKeySpecs(specTech)
    const engines = [buildEngineCard(vehicle, specTech)]

    await prisma.$executeRawUnsafe(
      `UPDATE vehicles SET specs =
         jsonb_set(
           jsonb_set(
             jsonb_set(COALESCE(specs, '{}'::jsonb), '{technicalData}', $1::jsonb, true),
             '{keySpecs}', $2::jsonb, true
           ),
           '{engines}', $3::jsonb, true
         )
       WHERE id = $4`,
      JSON.stringify(specTech),
      JSON.stringify(keySpecs),
      JSON.stringify(engines),
      vehicle.id,
    )
    updated += 1
  }

  console.log(`[seed:specs] ${updated} véhicule(s) mis à jour, ${ignored} ignoré(s).`)
}

run()
  .then(async () => {
    await closeDb()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('[seed:configurator-specs] Erreur inattendue :', err)
    try {
      await closeDb()
    } catch {
      // client déjà fermé
    }
    process.exit(1)
  })
