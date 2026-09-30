import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '../../shared/Modal'
import { formatPrice } from '../../../lib/price'

// priceFrom est un prix UK TVA incluse : la décomposition affichée
// recalcule la base hors taxes puis la TVA correspondante, pour que la
// somme des lignes redonne exactement le prix du modèle.
//
// `accessories` porte le catalogue résolu (GET /api/accessories) : les prix
// proviennent de la base, jamais du payload de configuration.
function PriceOverviewModal({
  open,
  specs,
  basePrice,
  accessories,
  selectedIds,
  locale,
  onClose,
}) {
  const { t } = useTranslation()

  const rows = useMemo(() => {
    const ids = Array.isArray(selectedIds) ? selectedIds : []
    const selected = (Array.isArray(accessories) ? accessories : []).filter(
      (item) => ids.includes(item.id) && item.inStock,
    )
    const optionsTotal = selected.reduce(
      (sum, option) => sum + (Number(option.price) || 0),
      0,
    )
    const otrFee = Number(specs?.onTheRoadFee) || 0
    const rate = Number(specs?.vatRate) || 0
    const netBase = rate > 0 ? Math.round(basePrice / (1 + rate)) : basePrice
    const vat = basePrice - netBase
    const total = netBase + vat + optionsTotal + otrFee

    return [
      { key: 'basePrice', label: 'basePrice', amount: netBase },
      { key: 'options', label: 'options', amount: optionsTotal },
      { key: 'vat', label: 'vat', amount: vat, note: rate },
      { key: 'otrFee', label: 'otrFee', amount: otrFee },
      { key: 'total', label: 'total', amount: total, strong: true },
    ]
  }, [basePrice, specs, accessories, selectedIds])

  return (
    <Modal
      open={open}
      title={t('configure.priceOverview.title')}
      onClose={onClose}
    >
      <div className="flex flex-col">
        {rows.map((row, index) => (
          <div
            key={row.key}
            className={`flex items-baseline justify-between gap-4 py-2 ${
              index === rows.length - 2 ? 'border-t border-gray-200' : ''
            }`}
          >
            <span
              className={
                row.strong
                  ? 'text-sm font-bold text-gray-900'
                  : 'text-sm text-gray-600'
              }
            >
              {t(`configure.priceOverview.labels.${row.label}`)}
              {row.note != null && (
                <span className="text-xs text-gray-400">
                  {' '}
                  {t('configure.priceOverview.rate', {
                    rate: Math.round(row.note * 100),
                  })}
                </span>
              )}
            </span>
            <span
              className={
                row.strong
                  ? 'text-lg font-bold text-gray-900'
                  : 'text-sm font-semibold text-gray-900'
              }
            >
              {formatPrice(row.amount, locale)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs italic text-gray-500">
        * {t('configure.priceOverview.footnote')}
      </p>
    </Modal>
  )
}

export default PriceOverviewModal
