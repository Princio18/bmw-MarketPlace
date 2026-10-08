import { useTranslation } from 'react-i18next'
import { Check, RotateCw } from 'lucide-react'
import { formatPrice } from '../../../lib/price'
import { SectionEmpty, SectionHeader, toList } from './sectionParts'

// Carte unique : BMW propose un seul moteur sur ce véhicule, l'onglet sert
// donc surtout à afficher ses caractéristiques clés en gros.
function EngineCard({ engine, locale, isSelected, onSelect }) {
  const { t } = useTranslation()

  return (
    <div
      onClick={() => onSelect(engine.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(engine.id)
        }
      }}
      className="relative w-80 cursor-pointer rounded-sm border bg-white p-4"
    >
      <div
        className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full ${
          isSelected ? 'bg-gray-900' : 'border border-gray-300'
        }`}
      >
        {isSelected && <Check className="h-4 w-4 text-white" />}
      </div>

      <h3 className="font-semibold">{engine.name}</h3>
      {engine.priceFrom != null && (
        <p className="mt-1 text-sm text-gray-600">
          {t('configure.section.from', {
            price: formatPrice(engine.priceFrom, locale),
          })}
        </p>
      )}

      {toList(engine.badges).length > 0 && (
        <div className="mt-2 flex gap-2">
          {engine.badges.map((badge) => (
            <span
              key={badge}
              className="rounded bg-gray-900 px-2 py-0.5 text-xs text-white"
            >
              {badge}
            </span>
          ))}
        </div>
      )}

      {engine.highlight && (
        <div className="mt-3 flex items-center gap-3 rounded bg-gray-50 p-3">
          <RotateCw className="h-6 w-6 text-gray-700" />
          <div>
            <div className="text-sm font-semibold">{engine.highlight.value}</div>
            <div className="text-xs text-blue-600">{engine.highlight.label}</div>
          </div>
        </div>
      )}

      {engine.rows?.length > 0 && (
        <div className="mt-3 space-y-1">
          {engine.rows.map((row) => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-gray-600">{row.label}</span>
              <span className="font-medium">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="mt-3 w-full rounded border border-gray-900 py-2 text-sm font-medium"
      >
        {t('configure.section.showDetails')}
      </button>
    </div>
  )
}

function EnginesSection({ specs, selectedId, onSelect, locale }) {
  const { t } = useTranslation()
  const engines = toList(specs?.engines)
  const title = t('configure.tabs.engines')

  if (engines.length === 0) {
    return <SectionEmpty title={title} message={t('configure.section.empty')} />
  }

  return (
    <div>
      <SectionHeader title={title} />
      <div className="mt-4 flex flex-wrap gap-4">
        {engines.map((engine) => (
          <EngineCard
            key={engine.id}
            engine={engine}
            locale={locale}
            isSelected={selectedId === engine.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

export default EnginesSection