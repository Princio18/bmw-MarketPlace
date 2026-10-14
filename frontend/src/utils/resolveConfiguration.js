// Résolution « configuration lisible » partagée par la fiche client et la
// fiche demande admin : transforme des identifiants de configuration en lignes
// affichables (modèle, moteur, couleur, jantes) + accessoires nommés/prix, et
// fournit une estimation de total.

const CONFIG_ROWS = [
  { key: 'modelId', list: 'models', label: 'Model', labelKey: 'configModel' },
  { key: 'engineId', list: 'engines', label: 'Engine', labelKey: 'configEngine' },
  { key: 'exteriorColourId', list: 'exteriorColours', label: 'Exterior colour', labelKey: 'configExterior' },
  { key: 'alloyWheelId', list: 'alloyWheels', label: 'Alloy wheels', labelKey: 'configWheels' },
]

const toList = (value) => (Array.isArray(value) ? value : [])

// `configuration_data` / `specs` peuvent arriver en objet (JSONB) ou en texte
// selon la forme du driver jsonb : on accepte les deux.
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

/**
 * @param {object|string} configurationData identifiants de configuration
 * @param {object|string} specs             specs du véhicule (JSONB)
 * @param {Array}         accessories        catalogue d'accessoires résolu
 * @param {object}        [options]
 * @param {Function}      [options.translate]  (labelKey, fallback) => libellé
 * @param {number}        [options.basePrice]  prix véhicule de repli
 * @returns {{ rows: Array, accessories: Array, optionalEquipment: Array, estimatedTotal: number }}
 */
export function resolveConfiguration(configurationData, specs, accessories, options = {}) {
  const { translate, basePrice } = options
  const configuration = asObject(configurationData)
  const spec = asObject(specs)
  const accessoryList = toList(accessories)

  const rows = CONFIG_ROWS.map((row) => {
    const id = configuration[row.key]
    if (!id) return null
    const option = toList(spec[row.list]).find((item) => item?.id === id)
    return {
      key: row.key,
      label: translate ? translate(row.labelKey, row.label) : row.label,
      // Un identifiant inconnu (option retirée du catalogue) reste affiché tel
      // quel : c'est précisément l'information qu'un vendeur doit voir.
      value: option?.name || id,
      hint: option?.code || null,
    }
  }).filter(Boolean)

  // Dédupliqué : un identifiant en double ferait gonfler le total.
  const selectedAccessories = [...new Set(toList(configuration.accessoryIds))].map((id) => {
    const accessory = accessoryList.find((item) => item?.id === id)
    return {
      id,
      name: accessory?.name || id,
      // Un accessoire absent du catalogue est archivé ou expiré : le serveur
      // refuserait la commande, on l'exclut donc de l'estimation (price null).
      price: accessory && accessory.inStock ? Number(accessory.price) || 0 : null,
    }
  })

  // Options d'équipement des specs (`optionalEquipmentIds`) : pas de stock,
  // prix toujours disponible. Affichées à part des accessoires.
  const selectedOptionalEquipment = [...new Set(toList(configuration.optionalEquipmentIds))].map(
    (id) => {
      const option = toList(spec.optionalEquipment).find((item) => item?.id === id)
      return {
        id,
        name: option?.name || id,
        price: option ? Number(option.price) || 0 : null,
      }
    },
  )

  const model = toList(spec.models).find((item) => item?.id === configuration.modelId)
  const base = model?.priceFrom ?? basePrice ?? 0
  const optionsTotal = selectedOptionalEquipment.reduce(
    (sum, item) => sum + (item.price ?? 0),
    0,
  )
  const accessoriesTotal = selectedAccessories.reduce(
    (sum, item) => sum + (item.price ?? 0),
    0,
  )

  // ESTIMATION uniquement : le montant facturé est toujours recalculé serveur.
  return {
    rows,
    accessories: selectedAccessories,
    optionalEquipment: selectedOptionalEquipment,
    estimatedTotal: base + accessoriesTotal + optionsTotal,
  }
}

export default resolveConfiguration
