// Déduit les mini-stats (keySpecs) et la carte moteur (engines) du
// configurateur à partir des seules données techniques (technicalData),
// sans aucune valeur arbitraire supplémentaire. Consommé par
// seedConfiguratorSpecs.js.

function isElectric(specTech) {
  return specTech.engine.fuelType === 'Electric'
}

function isPHEV(specTech) {
  return /hybrid/i.test(specTech.engine.fuelType)
}

function buildKeySpecs(specTech) {
  if (isElectric(specTech)) {
    return [
      { label: 'Electric range (WLTP)', value: specTech.electricRange.wltpRange },
      { label: 'Energy consumption (WLTP)', value: specTech.consumption.wltpEnergyConsumption },
      { label: 'Min. charge time DC', value: specTech.electricRange.chargingTimeDC },
    ]
  }
  if (isPHEV(specTech) && specTech.electricRange) {
    return [
      { label: 'Electric range (WLTP)', value: specTech.electricRange.wltpRange },
      { label: 'Fuel consumption (WLTP)', value: specTech.consumption.wltpEnergyConsumption },
      { label: 'Min. charge time AC', value: specTech.electricRange.chargingTimeAC },
    ]
  }
  return [
    { label: 'Top speed', value: specTech.engine.topSpeed },
    { label: 'Acceleration (0-62 mph)', value: specTech.performanceWeight.acceleration },
    { label: 'Fuel consumption (WLTP)', value: specTech.consumption.wltpEnergyConsumption },
  ]
}

function buildEngineCard(vehicle, specTech) {
  const useRangeHighlight = (isElectric(specTech) || isPHEV(specTech)) && specTech.electricRange
  return {
    id: `${vehicle.id}-engine`,
    name: `${vehicle.model_name} ${vehicle.variant_label}`,
    priceFrom: vehicle.base_price,
    badges: [specTech.engine.fuelType, specTech.engine.transmission.includes('Automatic') ? 'Automatic' : specTech.engine.transmission],
    highlight: useRangeHighlight
      ? { value: `Up to ${specTech.electricRange.wltpRange}`, label: 'Electric range (WLTP)' }
      : { value: `Up to ${specTech.engine.topSpeed}`, label: 'Top speed' },
    rows: useRangeHighlight
      ? [
          { label: 'Engine performance', value: specTech.engine.performance },
          { label: 'Top speed', value: specTech.engine.topSpeed },
          { label: '0-62 mph', value: specTech.performanceWeight.acceleration },
        ]
      : [
          { label: 'Engine performance', value: specTech.engine.performance },
          { label: '0-62 mph', value: specTech.performanceWeight.acceleration },
          { label: 'Fuel consumption (WLTP)', value: specTech.consumption.wltpEnergyConsumption },
        ],
  }
}

module.exports = { buildKeySpecs, buildEngineCard }