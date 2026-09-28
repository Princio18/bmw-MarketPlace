import { useTranslation } from 'react-i18next'

const SORT_OPTIONS = [
  { value: 'new_arrival', labelKey: 'allModels.sort.newArrivals' },
  { value: 'price_low_to_high', labelKey: 'allModels.sort.priceLowToHigh' },
  { value: 'price_high_to_low', labelKey: 'allModels.sort.priceHighToLow' },
]

function SortDropdown({ value, onChange }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="allModelsSort"
        className="hidden text-sm font-medium text-gray-600 sm:block dark:text-gray-300"
      >
        {t('allModels.sort.label')}
      </label>
      <select
        id="allModelsSort"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-gray-900 outline-none transition focus:border-bmw-blue focus:ring-2 focus:ring-bmw-blue/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </div>
  )
}

export default SortDropdown