import { useTranslation } from 'react-i18next'
import { formatPrice } from '../../../lib/price'
import { FALLBACK_IMAGE, SectionEmpty, SectionHeader } from './sectionParts'

// Les accessoires vivent en base (table `accessories`), pas dans les specs du
// véhicule : la liste est fournie par Configure.jsx (GET /api/accessories) et
// partagée avec la navbar et la modale de récapitulatif, afin qu'il n'existe
// qu'une seule source de vérité pour le total.
//
// Sélection MULTIPLE, contrairement aux onglets couleur / jante / sellerie.
function AccessoryCard({ accessory, isSelected, onToggle, locale }) {
  const { t } = useTranslation()
  const outOfStock = !accessory.inStock

  // Un accessoire en rupture ne peut pas être acheté : le bouton est inerte
  // plutôt que masqué, pour expliquer l'indisponibilité au client.
  let buttonClass = 'bg-blue-600 text-white hover:bg-blue-700'
  let label = t('configure.accessories.want')

  if (outOfStock) {
    buttonClass = 'cursor-not-allowed bg-gray-200 text-gray-400'
    label = t('configure.section.outOfStock')
  } else if (isSelected) {
    buttonClass = 'bg-gray-900 text-white hover:bg-gray-800'
    label = t('configure.accessories.added')
  }

  return (
    <div
      className={
        isSelected
          ? 'relative flex flex-col rounded-sm border-2 border-blue-600 bg-white p-3'
          : 'relative flex flex-col rounded-sm border border-gray-200 bg-white p-3'
      }
    >
      {accessory.badge && (
        <span className="absolute left-3 top-3 z-10 rounded-sm bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {accessory.badge}
        </span>
      )}

      <div className={accessory.badge ? 'mt-8' : 'mt-6'}>
        <img
          src={accessory.image || FALLBACK_IMAGE}
          alt={accessory.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = FALLBACK_IMAGE
          }}
          className="h-32 w-full rounded-sm bg-gray-50 object-contain"
        />
      </div>

      <p className="mt-3 text-sm font-bold text-gray-900">{accessory.name}</p>

      <p className="mt-1 text-sm text-gray-600">
        {t('configure.section.from', {
          price: formatPrice(accessory.price, locale),
        })}
      </p>

      {accessory.description && (
        <p className="mt-2 line-clamp-3 text-xs text-gray-500">
          {accessory.description}
        </p>
      )}

      {accessory.requiresAdjustment && (
        <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-amber-700">
          {t('configure.section.requiresAdjustment')}
        </p>
      )}

      {/* Le bouton fait office de case à cocher : `aria-pressed` expose l'état
          coché aux technologies d'assistance. */}
      <button
        type="button"
        onClick={() => !outOfStock && onToggle(accessory.id)}
        disabled={outOfStock}
        aria-pressed={isSelected}
        className={`mt-4 w-full rounded-sm px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${buttonClass}`}
      >
        {label}
      </button>
    </div>
  )
}

function AccessoriesSection({ accessories, selectedIds, onToggle, locale }) {
  const { t } = useTranslation()
  const title = t('configure.tabs.optionalEquipment')

  if (!Array.isArray(accessories) || accessories.length === 0) {
    return <SectionEmpty title={title} message={t('configure.section.empty')} />
  }

  const selected = new Set(Array.isArray(selectedIds) ? selectedIds : [])

  return (
    <div>
      <SectionHeader title={title} />

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
        {accessories.map((accessory) => (
          <AccessoryCard
            key={accessory.id}
            accessory={accessory}
            isSelected={selected.has(accessory.id)}
            onToggle={onToggle}
            locale={locale}
          />
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        {t('configure.accessories.count', { count: selected.size })} —{' '}
        {t('configure.accessories.includedInTotal')}
      </p>
    </div>
  )
}

export default AccessoriesSection
