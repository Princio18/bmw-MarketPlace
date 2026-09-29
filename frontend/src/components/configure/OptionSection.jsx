import { useTranslation } from 'react-i18next'
import { formatPrice } from '../../lib/price'

const FALLBACK_IMAGE = '/images/placeholder-vehicle.svg'

function OptionCard({ option, isSelected, locale, onSelect }) {
  const { t } = useTranslation()
  const hasPrice = option.priceFrom != null

  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      className={
        isSelected
          ? 'relative w-56 shrink-0 rounded-sm border-2 border-blue-600 bg-white p-3 text-left'
          : 'relative w-56 shrink-0 rounded-sm border border-gray-200 bg-white p-3 text-left transition hover:border-gray-400'
      }
    >
      <span
        aria-hidden="true"
        className={
          isSelected
            ? 'absolute right-3 top-3 h-4 w-4 rounded-full border-2 border-blue-600 bg-blue-600'
            : 'absolute right-3 top-3 h-4 w-4 rounded-full border-2 border-gray-300 bg-white'
        }
      />
      <span
        className="block pr-6 text-sm font-semibold text-gray-900"
        title={option.name}
      >
        {option.name}
      </span>
      {hasPrice && (
        <span className="mt-1 block text-xs text-gray-500">
          {t('configure.options.from', {
            price: formatPrice(option.priceFrom, locale),
          })}
        </span>
      )}
      <img
        src={option.image || FALLBACK_IMAGE}
        alt={option.name}
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = FALLBACK_IMAGE
        }}
        className="mt-3 h-28 w-full bg-gray-50 object-contain"
      />
      {option.note && (
        <span className="mt-2 block text-xs italic text-gray-500">
          {option.note}
        </span>
      )}
      <span
        className="mt-3 block border-t border-gray-200 pt-2 text-center text-xs font-semibold text-gray-700"
        role="button"
        tabIndex={-1}
      >
        {t('configure.options.showDetails')}
      </span>
    </button>
  )
}

function OptionSection({ tabKey, label, specs, selectedId, onSelect, locale }) {
  const { t } = useTranslation()

  if (tabKey === 'summary') {
    const model = Array.isArray(specs?.models)
      ? specs.models.find((m) => m.id === selectedId) || specs.models[0]
      : null
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {t('configure.tabs.summary')}
        </h2>
        {model ? (
          <div className="mt-4 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">
              {t('configure.options.summaryModel', { name: model.name })}
            </p>
            {model.priceFrom != null && (
              <p className="mt-1">
                {t('configure.options.summaryPrice', {
                  price: formatPrice(model.priceFrom, locale),
                })}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            {t('configure.options.summaryEmpty')}
          </p>
        )}
        <p className="mt-6 text-sm text-gray-400">
          {t('configure.options.summaryHint')}
        </p>
      </div>
    )
  }

  const options = Array.isArray(specs?.[tabKey]) ? specs[tabKey] : []

  if (options.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{label}</h2>
        <p className="mt-4 text-sm text-gray-500">
          {t('configure.options.empty', { label })}
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">{label}</h2>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {options.map((option) => (
          <OptionCard
            key={option.id ?? option.name}
            option={option}
            isSelected={selectedId === option.id}
            locale={locale}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

export default OptionSection
