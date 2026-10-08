// Données techniques "technicalData" pour les 11 véhicules du catalogue.
// À fusionner dans backend/scripts/seedConfiguratorSpecs.js : pour chaque
// véhicule, prendre specs.technicalData = technicalDataByVehicle['<slug>']
// Valeurs plausibles et cohérentes pour un projet démo — pas des chiffres
// officiels vérifiés.

const technicalDataByVehicle = {

  // 1. BMW M340i xDrive (Saloon, Petrol, série 3 M Performance)
  'm340i': {
    engine: {
      performance: '275 kW (374 hp)',
      torque: '500 Nm',
      fuelType: 'Petrol',
      transmission: '8-speed Steptronic Sport automatic',
      topSpeed: '155 mph',
    },
    consumption: {
      wltpEnergyConsumption: '34.9 mpg',
      wltpCO2: '184 g/km',
      passByNoise: '72 db(A)*',
    },
    electricRange: null, // non applicable — véhicule 100% thermique
    performanceWeight: {
      unladenWeight: '1730 kg',
      axleLoad: '1020 kg / 1100 kg',
      acceleration: '4.4 s',
      permittedLoad: '2250 kg',
      payload: '520 kg',
      maxTrailerLoad: '2000 kg / 100 kg',
      trailerLoadUnbraked: '750 kg',
    },
    dimensions: {
      lengthWidthHeight: '4719 mm / 1827 mm / 1442 mm',
      widthMirrorsDriver: '2004 mm',
      widthMirrorsPassenger: '2004 mm',
      seats: 5,
      wheelbase: '2851 mm (11.8 m)',
      luggageCapacity: '480 litre',
    },
  },

  // 2. BMW 520d (Saloon, Diesel, série 5)
  '520d': {
    engine: {
      performance: '145 kW (197 hp)',
      torque: '400 Nm',
      fuelType: 'Diesel',
      transmission: '8-speed Steptronic automatic',
      topSpeed: '144 mph',
    },
    consumption: {
      wltpEnergyConsumption: '55.4 mpg',
      wltpCO2: '134 g/km',
      passByNoise: '68 db(A)*',
    },
    electricRange: null,
    performanceWeight: {
      unladenWeight: '1695 kg',
      axleLoad: '990 kg / 1080 kg',
      acceleration: '7.8 s',
      permittedLoad: '2225 kg',
      payload: '530 kg',
      maxTrailerLoad: '2000 kg / 90 kg',
      trailerLoadUnbraked: '750 kg',
    },
    dimensions: {
      lengthWidthHeight: '5060 mm / 1900 mm / 1495 mm',
      widthMirrorsDriver: '2130 mm',
      widthMirrorsPassenger: '2130 mm',
      seats: 5,
      wheelbase: '2995 mm (11.9 m)',
      luggageCapacity: '530 litre',
    },
  },

  // 3. BMW 7 Series Protection (Saloon blindée, Petrol)
  '7-series-protection': {
    engine: {
      performance: '330 kW (449 hp)',
      torque: '650 Nm',
      fuelType: 'Petrol',
      transmission: '8-speed Steptronic automatic',
      topSpeed: '112 mph (limited)',
    },
    consumption: {
      wltpEnergyConsumption: '21.8 mpg',
      wltpCO2: '293 g/km',
      passByNoise: '74 db(A)*',
    },
    electricRange: null,
    performanceWeight: {
      unladenWeight: '3350 kg',
      axleLoad: '1750 kg / 1900 kg',
      acceleration: '6.9 s',
      permittedLoad: '3800 kg',
      payload: '450 kg',
      maxTrailerLoad: 'Not rated for towing',
      trailerLoadUnbraked: 'Not rated for towing',
    },
    dimensions: {
      lengthWidthHeight: '5391 mm / 1950 mm / 1555 mm',
      widthMirrorsDriver: '2210 mm',
      widthMirrorsPassenger: '2210 mm',
      seats: 4,
      wheelbase: '3210 mm (12.4 m)',
      luggageCapacity: '350 litre',
    },
  },

  // 4. BMW Concept XM (SUV, Petrol Plug-in Hybrid, V8)
  'concept-xm': {
    engine: {
      performance: '480 kW (653 hp) combined',
      torque: '800 Nm',
      fuelType: 'Petrol Plug-in Hybrid',
      transmission: '8-speed Steptronic Sport automatic',
      topSpeed: '155 mph',
    },
    consumption: {
      wltpEnergyConsumption: '72.4 mpg',
      wltpCO2: '89 g/km',
      passByNoise: '75 db(A)*',
    },
    electricRange: {
      wltpRange: '54 miles',
      batterySizeGross: '29.5 kWh',
      batterySizeNet: '25.7 kWh',
      chargingTimeAC: '2:30 h',
      maxChargingAC: '7.4 kW',
      chargingTimeDC: 'Not supported (AC only)',
      maxChargingDC: 'Not supported (AC only)',
      addedRange10Min: 'Not applicable (AC only)',
    },
    performanceWeight: {
      unladenWeight: '2820 kg',
      axleLoad: '1400 kg / 1550 kg',
      acceleration: '4.3 s',
      permittedLoad: '3200 kg',
      payload: '380 kg',
      maxTrailerLoad: '3000 kg / 120 kg',
      trailerLoadUnbraked: '750 kg',
    },
    dimensions: {
      lengthWidthHeight: '5110 mm / 2005 mm / 1755 mm',
      widthMirrorsDriver: '2230 mm',
      widthMirrorsPassenger: '2230 mm',
      seats: 5,
      wheelbase: '3105 mm (12.2 m)',
      luggageCapacity: '527 litre',
    },
  },

  // 5. BMW 330e (Saloon, Petrol Plug-in Hybrid, série 3)
  '330e': {
    engine: {
      performance: '215 kW (292 hp) combined',
      torque: '420 Nm',
      fuelType: 'Petrol Plug-in Hybrid',
      transmission: '8-speed Steptronic automatic',
      topSpeed: '143 mph',
    },
    consumption: {
      wltpEnergyConsumption: '134 mpg',
      wltpCO2: '24 g/km',
      passByNoise: '69 db(A)*',
    },
    electricRange: {
      wltpRange: '41 miles',
      batterySizeGross: '14.2 kWh',
      batterySizeNet: '12.7 kWh',
      chargingTimeAC: '3:15 h',
      maxChargingAC: '7.4 kW',
      chargingTimeDC: 'Not supported (AC only)',
      maxChargingDC: 'Not supported (AC only)',
      addedRange10Min: 'Not applicable (AC only)',
    },
    performanceWeight: {
      unladenWeight: '1785 kg',
      axleLoad: '1010 kg / 1090 kg',
      acceleration: '5.9 s',
      permittedLoad: '2305 kg',
      payload: '520 kg',
      maxTrailerLoad: '1600 kg / 90 kg',
      trailerLoadUnbraked: '680 kg',
    },
    dimensions: {
      lengthWidthHeight: '4713 mm / 1827 mm / 1442 mm',
      widthMirrorsDriver: '2004 mm',
      widthMirrorsPassenger: '2004 mm',
      seats: 5,
      wheelbase: '2851 mm (11.8 m)',
      luggageCapacity: '375 litre',
    },
  },

  // 6. BMW iX1 xDrive30 (SUV, Full Electric, série X)
  'ix1': {
    engine: {
      performance: '230 kW (313 hp)',
      torque: '494 Nm',
      fuelType: 'Electric',
      transmission: 'Automatic (single-speed)',
      topSpeed: '112 mph',
    },
    consumption: {
      wltpEnergyConsumption: '3.7 mi/kWh',
      wltpCO2: '0 g/km',
      passByNoise: '65 db(A)*',
    },
    electricRange: {
      wltpRange: '272 miles',
      batterySizeGross: '66.4 kWh',
      batterySizeNet: '64.7 kWh',
      chargingTimeAC: '6:30 h',
      maxChargingAC: '11 kW',
      chargingTimeDC: '0:29 h',
      maxChargingDC: '130 kW',
      addedRange10Min: '75 – 95 miles',
    },
    performanceWeight: {
      unladenWeight: '2042 kg',
      axleLoad: '1090 kg / 1220 kg',
      acceleration: '5.6 s',
      permittedLoad: '2500 kg',
      payload: '458 kg',
      maxTrailerLoad: '1200 kg / 80 kg',
      trailerLoadUnbraked: '750 kg',
    },
    dimensions: {
      lengthWidthHeight: '4500 mm / 1845 mm / 1616 mm',
      widthMirrorsDriver: '2048 mm',
      widthMirrorsPassenger: '2048 mm',
      seats: 5,
      wheelbase: '2692 mm (11.4 m)',
      luggageCapacity: '490 – 1495 litre',
    },
  },

  // 7. BMW iX2 xDrive30 (SUV Coupé, Full Electric, série X)
  'ix2': {
    engine: {
      performance: '230 kW (313 hp)',
      torque: '494 Nm',
      fuelType: 'Electric',
      transmission: 'Automatic (single-speed)',
      topSpeed: '112 mph',
    },
    consumption: {
      wltpEnergyConsumption: '3.6 mi/kWh',
      wltpCO2: '0 g/km',
      passByNoise: '65 db(A)*',
    },
    electricRange: {
      wltpRange: '268 miles',
      batterySizeGross: '66.4 kWh',
      batterySizeNet: '64.7 kWh',
      chargingTimeAC: '6:30 h',
      maxChargingAC: '11 kW',
      chargingTimeDC: '0:29 h',
      maxChargingDC: '130 kW',
      addedRange10Min: '73 – 93 miles',
    },
    performanceWeight: {
      unladenWeight: '2070 kg',
      axleLoad: '1100 kg / 1230 kg',
      acceleration: '5.7 s',
      permittedLoad: '2520 kg',
      payload: '450 kg',
      maxTrailerLoad: '1200 kg / 80 kg',
      trailerLoadUnbraked: '750 kg',
    },
    dimensions: {
      lengthWidthHeight: '4554 mm / 1845 mm / 1559 mm',
      widthMirrorsDriver: '2048 mm',
      widthMirrorsPassenger: '2048 mm',
      seats: 5,
      wheelbase: '2692 mm (11.4 m)',
      luggageCapacity: '460 litre',
    },
  },

  // 8. BMW iX3 (SUV, Full Electric, série X)
  'ix3': {
    engine: {
      performance: '210 kW (286 hp)',
      torque: '400 Nm',
      fuelType: 'Electric',
      transmission: 'Automatic (single-speed)',
      topSpeed: '112 mph',
    },
    consumption: {
      wltpEnergyConsumption: '3.9 mi/kWh',
      wltpCO2: '0 g/km',
      passByNoise: '66 db(A)*',
    },
    electricRange: {
      wltpRange: '285 miles',
      batterySizeGross: '74.0 kWh',
      batterySizeNet: '72.0 kWh',
      chargingTimeAC: '7:30 h',
      maxChargingAC: '11 kW',
      chargingTimeDC: '0:34 h',
      maxChargingDC: '150 kW',
      addedRange10Min: '80 – 100 miles',
    },
    performanceWeight: {
      unladenWeight: '2185 kg',
      axleLoad: '1150 kg / 1280 kg',
      acceleration: '6.8 s',
      permittedLoad: '2650 kg',
      payload: '465 kg',
      maxTrailerLoad: '1500 kg / 100 kg',
      trailerLoadUnbraked: '750 kg',
    },
    dimensions: {
      lengthWidthHeight: '4734 mm / 1891 mm / 1668 mm',
      widthMirrorsDriver: '2112 mm',
      widthMirrorsPassenger: '2112 mm',
      seats: 5,
      wheelbase: '2864 mm (11.7 m)',
      luggageCapacity: '510 – 1560 litre',
    },
  },

  // 9. BMW iX3 M Performance (SUV, Full Electric, série X, dual-motor)
  'ix3-m-performance': {
    engine: {
      performance: '345 kW (469 hp)',
      torque: '650 Nm',
      fuelType: 'Electric',
      transmission: 'Automatic (single-speed)',
      topSpeed: '149 mph',
    },
    consumption: {
      wltpEnergyConsumption: '3.4 mi/kWh',
      wltpCO2: '0 g/km',
      passByNoise: '67 db(A)*',
    },
    electricRange: {
      wltpRange: '258 miles',
      batterySizeGross: '74.0 kWh',
      batterySizeNet: '72.0 kWh',
      chargingTimeAC: '7:30 h',
      maxChargingAC: '11 kW',
      chargingTimeDC: '0:34 h',
      maxChargingDC: '150 kW',
      addedRange10Min: '76 – 96 miles',
    },
    performanceWeight: {
      unladenWeight: '2280 kg',
      axleLoad: '1190 kg / 1320 kg',
      acceleration: '3.8 s',
      permittedLoad: '2730 kg',
      payload: '450 kg',
      maxTrailerLoad: '1500 kg / 100 kg',
      trailerLoadUnbraked: '750 kg',
    },
    dimensions: {
      lengthWidthHeight: '4734 mm / 1891 mm / 1668 mm',
      widthMirrorsDriver: '2112 mm',
      widthMirrorsPassenger: '2112 mm',
      seats: 5,
      wheelbase: '2864 mm (11.7 m)',
      luggageCapacity: '510 – 1560 litre',
    },
  },

  // 10. BMW iX5 (SUV, Full Electric, série X, grand format)
  'ix5': {
    engine: {
      performance: '385 kW (523 hp)',
      torque: '765 Nm',
      fuelType: 'Electric',
      transmission: 'Automatic (single-speed)',
      topSpeed: '130 mph',
    },
    consumption: {
      wltpEnergyConsumption: '3.1 mi/kWh',
      wltpCO2: '0 g/km',
      passByNoise: '68 db(A)*',
    },
    electricRange: {
      wltpRange: '320 miles',
      batterySizeGross: '108.0 kWh',
      batterySizeNet: '105.2 kWh',
      chargingTimeAC: '10:30 h',
      maxChargingAC: '11 kW',
      chargingTimeDC: '0:31 h',
      maxChargingDC: '195 kW',
      addedRange10Min: '90 – 110 miles',
    },
    performanceWeight: {
      unladenWeight: '2655 kg',
      axleLoad: '1380 kg / 1520 kg',
      acceleration: '4.6 s',
      permittedLoad: '3150 kg',
      payload: '495 kg',
      maxTrailerLoad: '2700 kg / 120 kg',
      trailerLoadUnbraked: '750 kg',
    },
    dimensions: {
      lengthWidthHeight: '5080 mm / 2005 mm / 1705 mm',
      widthMirrorsDriver: '2225 mm',
      widthMirrorsPassenger: '2225 mm',
      seats: 7,
      wheelbase: '3105 mm (12.2 m)',
      luggageCapacity: '560 – 1820 litre',
    },
  },

  // 11. BMW iX (SUV, Full Electric, série X, modèle phare)
  'ix': {
    engine: {
      performance: '326 kW (443 hp)',
      torque: '630 Nm',
      fuelType: 'Electric',
      transmission: 'Automatic (single-speed)',
      topSpeed: '124 mph',
    },
    consumption: {
      wltpEnergyConsumption: '3.2 mi/kWh',
      wltpCO2: '0 g/km',
      passByNoise: '66 db(A)*',
    },
    electricRange: {
      wltpRange: '308 miles',
      batterySizeGross: '111.5 kWh',
      batterySizeNet: '105.8 kWh',
      chargingTimeAC: '11:00 h',
      maxChargingAC: '11 kW',
      chargingTimeDC: '0:35 h',
      maxChargingDC: '195 kW',
      addedRange10Min: '85 – 105 miles',
    },
    performanceWeight: {
      unladenWeight: '2510 kg',
      axleLoad: '1310 kg / 1420 kg',
      acceleration: '4.6 s',
      permittedLoad: '2995 kg',
      payload: '485 kg',
      maxTrailerLoad: '2500 kg / 110 kg',
      trailerLoadUnbraked: '750 kg',
    },
    dimensions: {
      lengthWidthHeight: '4953 mm / 1967 mm / 1695 mm',
      widthMirrorsDriver: '2175 mm',
      widthMirrorsPassenger: '2175 mm',
      seats: 5,
      wheelbase: '3000 mm (12.0 m)',
      luggageCapacity: '500 – 1750 litre',
    },
  },

};

module.exports = technicalDataByVehicle;