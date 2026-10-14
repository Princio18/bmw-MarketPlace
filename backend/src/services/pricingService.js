const { prisma } = require('../db')
const accessoryService = require('./accessoryService')

// Valeurs de repli si les specs du véhicule ne les fournissent pas.
const DEFAULT_VAT_RATE = 0.2
const DEFAULT_OTR_FEE = 1005

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const toList = (value) => (Array.isArray(value) ? value : [])

function asObject(value) {
  if (value && typeof value === 'object') return value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

// Tout est calculé en PENCE ENTIERS : les prix catalogue sont des décimaux et
// une somme de flottants finit par dériver (0.1 + 0.2). On ne revient en livres
// qu'à la toute fin.
const toPence = (amount) => Math.round(Number(amount) * 100)
const fromPence = (pence) => pence / 100

// Décompte d'une offre. NE LIT QUE DES IDS depuis `configurationData` : les
// prix proviennent exclusivement des specs côté serveur et des accessoires
// rechargés en base, jamais du payload client.
//
// Convention TVA INCLUSE : chaque `amount` de ligne est un prix TTC. Le total
// est donc la simple somme des lignes. La TVA est donnée à titre informatif
// (recalc de la part TTC) pour l'affichage du reçu / de l'offre.
//
// Retourne { currency, vatRate, lines, total, vatAmount, netTotal, warnings }.
function computeOfferPricing({
  configurationData,
  specs,
  basePrice = null,
  vehicleLabel = 'BMW',
  accessories = [],
  missingAccessoryIds = [],
  adjustments = [],
  vehiclePriceOverride = null,
}) {
  const configuration = asObject(configurationData)
  const spec = asObject(specs)
  const warnings = []
  const lines = []

  // --- Véhicule -------------------------------------------------------------
  const model = toList(spec.models).find((item) => item?.id === configuration.modelId)
  const vehiclePrice =
    vehiclePriceOverride != null
      ? Number(vehiclePriceOverride)
      : model?.priceFrom != null
        ? Number(model.priceFrom)
        : basePrice != null
          ? Number(basePrice)
          : null

  if (vehiclePrice == null || Number.isNaN(vehiclePrice)) {
    const err = new Error('Vehicle price is required to build an offer.')
    err.code = 'PRICE_REQUIRED'
    throw err
  }
  lines.push({ key: 'vehicle', kind: 'vehicle', label: vehicleLabel, amount: vehiclePrice, counted: true })

  // --- Jantes alliage -------------------------------------------------------
  if (configuration.alloyWheelId) {
    const wheel = toList(spec.alloyWheels).find((item) => item?.id === configuration.alloyWheelId)
    if (wheel && Number(wheel.price) > 0) {
      lines.push({
        key: 'alloyWheels',
        kind: 'alloyWheels',
        label: wheel.name || 'Alloy wheels',
        amount: Number(wheel.price),
        refId: wheel.id,
        counted: true,
      })
    }
  }

  // --- Options (équipement en option des specs) -----------------------------
  for (const id of [...new Set(toList(configuration.optionalEquipmentIds))]) {
    const option = toList(spec.optionalEquipment).find((item) => item?.id === id)
    if (option && Number(option.price) > 0) {
      lines.push({
        key: `optionalEquipment:${id}`,
        kind: 'optionalEquipment',
        label: option.name || id,
        amount: Number(option.price),
        refId: id,
        counted: true,
      })
    }
  }

  // --- Accessoires (rechargés en base : refId + inStock) --------------------
  const byId = new Map(toList(accessories).map((item) => [item.id, item]))
  const seenAccessories = new Set()
  for (const id of toList(configuration.accessoryIds)) {
    if (seenAccessories.has(id)) continue
    seenAccessories.add(id)
    const accessory = byId.get(id)
    if (!accessory) continue
    const inStock = accessory.inStock !== false
    if (!inStock) warnings.push(accessory.name || id)
    lines.push({
      key: `accessory:${id}`,
      kind: 'accessory',
      // Un accessoire en rupture est listé mais NON compté : l'offre ne facture
      // jamais un article que le serveur refusera au paiement.
      counted: inStock,
      refId: id,
      inStock,
      label: accessory.name || id,
      amount: Number(accessory.price) || 0,
    })
  }
  for (const id of toList(missingAccessoryIds)) {
    warnings.push(id)
  }

  // --- Frais de mise à la route (OTR, TTC) ----------------------------------
  const otrFee = spec.onTheRoadFee != null ? Number(spec.onTheRoadFee) : DEFAULT_OTR_FEE
  if (otrFee > 0) {
    lines.push({ key: 'onTheRoadFee', kind: 'onTheRoadFee', label: 'On-the-road fee', amount: otrFee, counted: true })
  }

  // --- Ajustements admin (remises / majorations libres) ---------------------
  toList(adjustments).forEach((adjustment, index) => {
    const amount = Number(adjustment?.amount)
    if (!Number.isFinite(amount) || amount === 0) return
    lines.push({
      key: `adjustment:${index}`,
      kind: 'adjustment',
      label: adjustment?.label || 'Adjustment',
      amount,
      counted: true,
    })
  })

  const totalPence = lines
    .filter((line) => line.counted !== false)
    .reduce((sum, line) => sum + toPence(line.amount), 0)

  const vatRate = spec.vatRate != null ? Number(spec.vatRate) : DEFAULT_VAT_RATE
  const netTotalPence = vatRate > 0 ? Math.round(totalPence / (1 + vatRate)) : totalPence
  const vatPence = totalPence - netTotalPence

  return {
    currency: 'GBP',
    vatRate,
    lines: lines.map((line) => ({
      ...line,
      amount: fromPence(toPence(line.amount)),
      counted: line.counted !== false,
    })),
    total: fromPence(totalPence),
    netTotal: fromPence(netTotalPence),
    vatAmount: fromPence(vatPence),
    warnings,
  }
}

// Recharge les accessoires sélectionnés depuis la base et calcule la tarification
// d'une configuration (specs + base_price du véhicule). Utilitaire partagé par
// l'aperçu et l'émission d'offre.
async function computeRequestPricing({ vehicle, configurationData, adjustments } = {}) {
  const accessoryIds = asObject(configurationData).accessoryIds
  const { items, missing } = await accessoryService.resolveAccessories(accessoryIds)

  // Accessoires qui ne sont plus rattachés au véhicule : ids invalides pour
  // cette offre, traités comme manquants (warning).
  if (vehicle?.id) {
    const unassigned = await accessoryService.findUnassignedAccessoryIds(
      vehicle.id,
      accessoryIds,
    )
    for (const id of unassigned) if (!missing.includes(id)) missing.push(id)
  }

  const label = `BMW ${vehicle?.model_name ?? ''}${
    vehicle?.variant_label ? ` — ${vehicle.variant_label}` : ''
  }`.trim()

  return computeOfferPricing({
    configurationData,
    specs: vehicle?.specs,
    basePrice: vehicle?.base_price == null ? null : Number(vehicle.base_price),
    vehicleLabel: label,
    accessories: items,
    missingAccessoryIds: missing,
    adjustments,
  })
}

module.exports = {
  computeOfferPricing,
  computeRequestPricing,
  DEFAULT_VAT_RATE,
  DEFAULT_OTR_FEE,
  UUID_RE,
}
