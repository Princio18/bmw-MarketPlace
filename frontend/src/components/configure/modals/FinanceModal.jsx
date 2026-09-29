import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import Modal from '../../shared/Modal'
import { formatPrice } from '../../../lib/price'

const MILEAGES = [5000, 10000, 15000, 20000]
const CONTRACT_LENGTHS = [24, 36, 48]

// Les deux selects sont purement visuels : aucun recalcul du montant.
// La sélection du produit financier est contrôlée par Configure.jsx pour
// rester la source de vérité partagée avec la navbar.
function FinanceModal({
  open,
  vehicle,
  locale,
  selectedFinanceId,
  onSelectFinance,
  onClose,
}) {
  const { t } = useTranslation()
  const financeOptions = Array.isArray(vehicle?.specs?.financeOptions)
    ? vehicle.specs.financeOptions
    : []
  const selected =
    financeOptions.find((option) => option.id === selectedFinanceId) ||
    financeOptions[0] ||
    null

  return (
    <Modal
      open={open}
      title={t('configure.finance.title')}
      onClose={onClose}
    >
      <p className="text-xs text-gray-500">
        {t('configure.finance.step1')}
      </p>
      <h3 className="text-base font-semibold text-gray-900">
        {t('configure.finance.step1Title')}
      </h3>

      <div className="mt-4 grid grid-cols-3 gap-4">
        {financeOptions.map((option) => {
          const isSelected = option.id === selected?.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectFinance(option.id)}
              aria-pressed={isSelected}
              className={`relative flex flex-col rounded border p-4 text-left transition ${
                isSelected
                  ? 'border-blue-600 ring-1 ring-blue-600'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              {isSelected && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                  <Check size={12} aria-hidden="true" />
                </span>
              )}
              <span className="pr-6 text-sm font-bold text-gray-900">
                {option.name}
              </span>
              <span className="mt-2 text-xs text-gray-600">
                {option.description}
              </span>
              <span className="mt-4 text-xs uppercase tracking-wide text-gray-400">
                {t(
                  option.type === 'payment'
                    ? 'configure.finance.monthlyPayment'
                    : 'configure.finance.monthlyRental',
                )}
              </span>
              <span className="text-lg font-bold text-gray-900">
                {option.monthly != null
                  ? formatPrice(option.monthly, locale, 2)
                  : '—'}
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-8 text-xs text-gray-500">
        {t('configure.finance.step2')}
      </p>
      <h3 className="text-base font-semibold text-gray-900">
        {t('configure.finance.step2Title')}
      </h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          {t('configure.finance.mileagePerYear')}
          <select
            defaultValue={MILEAGES[1]}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {MILEAGES.map((mileage) => (
              <option key={mileage} value={mileage}>
                {t('configure.finance.mileageOption', {
                  count: mileage.toLocaleString('en-GB'),
                })}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-500">
          {t('configure.finance.contractLength')}
          <select
            defaultValue={CONTRACT_LENGTHS[1]}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {CONTRACT_LENGTHS.map((months) => (
              <option key={months} value={months}>
                {t('configure.finance.contractOption', { months })}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-4 border-t border-gray-200 bg-white pt-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {selected?.name || t('configure.finance.noProduct')}
          </p>
          <p className="text-sm text-gray-600">
            {selected?.monthly != null
              ? formatPrice(selected.monthly, locale, 2)
              : '—'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-sm bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {t('configure.finance.accept')}
        </button>
      </div>
    </Modal>
  )
}

export default FinanceModal
