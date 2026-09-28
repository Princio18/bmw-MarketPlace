import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, RotateCcw } from 'lucide-react'
import DrivetrainIcon from './DrivetrainIcon'

const DRIVETRAINS = [
  'electric',
  'hybrid',
  'petrol',
  'diesel',
  'concept',
  'protection',
]

function FilterSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-zinc-200 pb-5 dark:border-gray-800">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-3 text-left"
      >
        <span className="font-manrope text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-white">
          {title}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-300 dark:text-gray-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && <div className="mt-2 space-y-2.5">{children}</div>}
    </div>
  )
}

function FilterSidebar({ vehicles, filters, onChange, priceBounds }) {
  const { t } = useTranslation()

  const categories = [...new Set(vehicles.map((v) => v.category))].sort()
  const series = [...new Set(vehicles.map((v) => v.series))].sort()

  const toggleInList = (key, item) => {
    const list = filters[key]
    const next = list.includes(item)
      ? list.filter((value) => value !== item)
      : [...list, item]
    onChange({ ...filters, [key]: next })
  }

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.series.length > 0 ||
    filters.drivetrains.length > 0 ||
    filters.mPerformance ||
    filters.priceMin !== '' ||
    filters.priceMax !== ''

  return (
    <aside className="w-full">
      <div className="flex items-center justify-between">
        <h2 className="font-manrope text-base font-semibold text-gray-900 dark:text-white">
          {t('allModels.sidebar.filters')}
        </h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() =>
              onChange({
                categories: [],
                series: [],
                drivetrains: [],
                mPerformance: false,
                priceMin: '',
                priceMax: '',
              })
            }
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition hover:text-bmw-blue dark:text-gray-400"
          >
            <RotateCcw size={13} />
            {t('allModels.sidebar.reset')}
          </button>
        )}
      </div>

      <FilterSection title={t('allModels.sidebar.categories')}>
        {categories.length === 0 ? (
          <p className="text-sm text-gray-400">{t('allModels.sidebar.noOptions')}</p>
        ) : (
          categories.map((category) => (
            <label
              key={category}
              className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <input
                type="checkbox"
                checked={filters.categories.includes(category)}
                onChange={() => toggleInList('categories', category)}
                className="h-4 w-4 rounded accent-bmw-blue"
              />
              {category}
            </label>
          ))
        )}
      </FilterSection>

      <FilterSection title={t('allModels.sidebar.series')}>
        {series.map((s) => (
          <label
            key={s}
            className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <input
              type="checkbox"
              checked={filters.series.includes(s)}
              onChange={() => toggleInList('series', s)}
              className="h-4 w-4 rounded accent-bmw-blue"
            />
            {t('allModels.series', { series: s })}
          </label>
        ))}
      </FilterSection>

      <FilterSection title={t('allModels.sidebar.drivetrains')}>
        {DRIVETRAINS.map((drivetrain) => (
          <label
            key={drivetrain}
            className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <input
              type="checkbox"
              checked={filters.drivetrains.includes(drivetrain)}
              onChange={() => toggleInList('drivetrains', drivetrain)}
              className="h-4 w-4 rounded accent-bmw-blue"
            />
            <DrivetrainIcon drivetrain={drivetrain} size={15} className="text-gray-400" />
            {t(`allModels.drivetrains.${drivetrain}`)}
          </label>
        ))}
      </FilterSection>

      <FilterSection title={t('allModels.sidebar.performance')}>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={filters.mPerformance}
            onChange={() => onChange({ ...filters, mPerformance: !filters.mPerformance })}
            className="h-4 w-4 rounded accent-bmw-blue"
          />
          <span className="rounded-sm bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold text-white dark:bg-white dark:text-gray-900">
            M
          </span>
          {t('allModels.sidebar.mPerformance')}
        </label>
      </FilterSection>

      <FilterSection title={t('allModels.sidebar.price')}>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="allModelsPriceMin">
            {t('allModels.sidebar.priceMin')}
          </label>
          <input
            id="allModelsPriceMin"
            type="number"
            min={priceBounds?.min ?? 0}
            value={filters.priceMin}
            onChange={(e) => onChange({ ...filters, priceMin: e.target.value })}
            placeholder={priceBounds?.min != null ? String(priceBounds.min) : '0'}
            className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-bmw-blue focus:ring-2 focus:ring-bmw-blue/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          <span aria-hidden="true" className="text-gray-400">
            —
          </span>
          <label className="sr-only" htmlFor="allModelsPriceMax">
            {t('allModels.sidebar.priceMax')}
          </label>
          <input
            id="allModelsPriceMax"
            type="number"
            min={priceBounds?.min ?? 0}
            value={filters.priceMax}
            onChange={(e) => onChange({ ...filters, priceMax: e.target.value })}
            placeholder={priceBounds?.max != null ? String(priceBounds.max) : ''}
            className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-bmw-blue focus:ring-2 focus:ring-bmw-blue/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t('allModels.sidebar.priceHint')}
        </p>
      </FilterSection>
    </aside>
  )
}

export default FilterSidebar