require('dotenv').config()

const { closeDb, prisma } = require('../src/db')

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
      image: '/images/vehicles/placeholder-sport-edition.jpg',
      note: null,
    },
    {
      id: 'm-sport',
      name: 'M Sport',
      priceFrom: 82575,
      image: '/images/vehicles/placeholder-m-sport.jpg',
      note: 'Selecting this option will change your engine',
    },
  ],
  engines: [],
  exteriorColours: [],
  alloyWheels: [],
  upholstery: [],
  interiorTrims: [],
  packages: [],
  optionalEquipment: [],
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
