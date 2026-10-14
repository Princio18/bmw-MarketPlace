import { useTranslation } from 'react-i18next'
import { formatPrice } from '../../../lib/price'
import { FALLBACK_IMAGE, SectionEmpty, SectionHeader } from './sectionParts'

// Options d'équipement définies dans les specs du véhicule (`specs.optionalEquipment`),
// DISTINCTES des accessoires en base (table `accessories`, onglet « Accessories »).
//
// Sélection MULTIPLE via `optionalEquipmentIds` dans la configuration.
function OptionalEquipmentCard({ option, isSelected, onToggle, locale }) {
  const { t } = useTranslation()

  return (
    <div
      className={
        isSelected
          ? 'relative flex flex-col rounded-sm border-2 border-blue-600 bg-white p-3'
          : 'relative flex flex-col rounded-sm border border-gray-200 bg-white p-3'
      }
    >
      {option.badge && (
        <span className="absolute left-3 top-3 z-10 rounded-sm bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {option.badge}
        </span>
      )}

      <div className={option.badge ? 'mt-8' : 'mt-6'}>
        <img
          src={option.image || FALLBACK_IMAGE}
          alt={option.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = FALLBACK_IMAGE
          }}
          className="h-32 w-full rounded-sm bg-gray-50 object-contain"
        />
      </div>

      <p className="mt-3 text-sm font-bold text-gray-900">{option.name}</p>

      <p className="mt-1 text-sm text-gray-600">
        {Number(option.price) > 0
          ? t('configure.section.from', { price: formatPrice(option.price, locale) })
          : t('configure.section.included')}
      </p>

      {option.description && (
        <p className="mt-2 line-clamp-3 text-xs text-gray-500">{option.description}</p>
      )}

      <button
        type="button"
        onClick={() => onToggle(option.id)}
        aria-pressed={isSelected}
        className={`mt-4 w-full rounded-sm px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
          isSelected
            ? 'bg-gray-900 text-white hover:bg-gray-800'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isSelected ? t('configure.optionalEquipment.added') : t('configure.optionalEquipment.want')}
      </button>
    </div>
  )
}

function OptionalEquipmentSection({ specs, selectedIds, onToggle, locale }) {
  const { t } = useTranslation()
  const title = t('configure.tabs.optionalEquipment')
  const options = Array.isArray(specs?.optionalEquipment) ? specs.optionalEquipment : []

  if (options.length === 0) {
    return <SectionEmpty title={title} message={t('configure.section.empty')} />
  }

  const selected = new Set(Array.isArray(selectedIds) ? selectedIds : [])

  return (
    <div>
      <SectionHeader title={title} />

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
        {options.map((option) => (
          <OptionalEquipmentCard
            key={option.id}
            option={option}
            isSelected={selected.has(option.id)}
            onToggle={onToggle}
            locale={locale}
          />
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        {t('configure.optionalEquipment.count', { count: selected.size })} —{' '}
        {t('configure.optionalEquipment.includedInTotal')}
      </p>
    </div>
  )
}

export default OptionalEquipmentSection
