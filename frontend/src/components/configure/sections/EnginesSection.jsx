import { useTranslation } from 'react-i18next'
import { Info, Zap } from 'lucide-react'
import { formatPrice } from '../../../lib/price'
import {
  SectionEmpty,
  SectionHeader,
  ShowDetailsButton,
  toList,
} from './sectionParts'

// Carte unique : BMW propose un seul moteur sur ce véhicule, l'onglet sert
// donc surtout à afficher ses caractéristiques clés en gros.
function EngineCard({ engine, locale, isSelected, onSelect }) {
  const { t } = useTranslation()
  const rows = [
    ['enginePerformance', engine.enginePerformance],
    ['topSpeed', engine.topSpeed],
    ['acceleration', engine.acceleration],
  ]

  return (
    <button
      type="button"
      onClick={() => onSelect(engine.id)}
      aria-pressed={isSelected}
      className={
        isSelected
          ? 'relative w-full rounded-sm border-2 border-blue-600 bg-white p-4 text-left'
          : 'relative w-full rounded-sm border border-gray-200 bg-white p-4 text-left transition hover:border-gray-400'
      }
    >
      <span
        aria-hidden="true"
        className={
          isSelected
            ? 'absolute right-4 top-4 h-4 w-4 rounded-full border-2 border-blue-600 bg-blue-600'
            : 'absolute right-4 top-4 h-4 w-4 rounded-full border-2 border-gray-300 bg-white'
        }
      />

      <div className="pr-8">
        <p className="text-base font-bold text-gray-900">{engine.name}</p>
        {engine.priceFrom != null && (
          <p className="mt-1 text-sm text-gray-500">
            {t('configure.section.from', {
              price: formatPrice(engine.priceFrom, locale),
            })}
          </p>
        )}
      </div>

      {toList(engine.badges).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {engine.badges.map((badge) => (
            <span
              key={badge}
              className="rounded-sm bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600"
            >
              {badge}
            </span>
          ))}
        </div>
      )}

      {engine.range && (
        <div className="mt-4 flex items-start gap-3 rounded-sm bg-gray-50 p-4">
          <Zap size={20} className="mt-0.5 shrink-0 text-gray-700" aria-hidden="true" />
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
              {engine.rangeLabel}
              <span title={engine.rangeLabel}>
                <Info size={11} className="text-gray-400" aria-hidden="true" />
              </span>
            </p>
            <p className="text-lg font-bold text-gray-900">{engine.range}</p>
          </div>
        </div>
      )}

      <dl className="mt-4 space-y-2">
        {rows.map(([key, value]) => (
          <div
            key={key}
            className="flex items-baseline justify-between gap-4 border-b border-gray-100 pb-2 last:border-0"
          >
            <dt className="text-xs text-gray-500">{t(`configure.engines.${key}`)}</dt>
            <dd className="text-sm font-semibold text-gray-900">{value || '—'}</dd>
          </div>
        ))}
      </dl>

      <ShowDetailsButton />
    </button>
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
      <div className="mt-4 max-w-md">
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
