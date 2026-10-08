import { useTranslation } from 'react-i18next'
import {
  Bell,
  Calculator,
  ChevronRight,
  Info,
  RefreshCw,
} from 'lucide-react'
import bmwLogo from '../../assets/images/bmw-logo1.png'
import { formatPrice } from '../../lib/price'
import { NAVBAR_HEIGHT } from './layout'

function MiniStat({ label, value }) {
  return (
    <div>
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-1 font-semibold">
        {value} <Info className="h-3.5 w-3.5 text-gray-400" title={label} />
      </div>
    </div>
  )
}

function PriceBlock({ label, value, onClick, icon: Icon, suffix }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-end text-right"
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </span>
      <span className="flex items-center gap-1 text-sm font-bold text-gray-900">
        {value}
        {Icon && <Icon size={13} className="text-gray-500" aria-hidden="true" />}
        {suffix && (
          <span className="text-[10px] font-normal text-gray-400">{suffix}</span>
        )}
      </span>
    </button>
  )
}

function ConfiguratorNavbar({
  vehicle,
  totalPrice,
  monthlyPrice,
  locale,
  onOpenModal,
  onReset,
}) {
  const { t } = useTranslation()
  const fallback = t('configure.navbar.notAvailable')
  const title = [vehicle.modelName, vehicle.variantLabel]
    .filter(Boolean)
    .join(' ')

  return (
    <header
      className="fixed left-0 right-0 top-0 z-40 border-b border-gray-200 bg-white"
      style={{ height: NAVBAR_HEIGHT }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1800px] items-center gap-6 px-6">
        <div className="flex min-w-0 items-center gap-3">
          <img src={bmwLogo} alt="BMW" className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-gray-900">{title}</p>
              <button
                type="button"
                onClick={onReset}
                title={t('configure.navbar.reset')}
                aria-label={t('configure.navbar.reset')}
                className="shrink-0 rounded-sm p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <RefreshCw size={13} />
              </button>
            </div>
            <p className="truncate text-xs text-gray-500">
              {t('configure.navbar.seriesModels', { series: vehicle.series })}
            </p>
          </div>
        </div>

        <div className="ml-auto hidden items-center gap-6 xl:flex">
          {vehicle.specs?.keySpecs?.map((spec) => (
            <MiniStat key={spec.label} label={spec.label} value={spec.value} />
          ))}
          <button
            type="button"
            onClick={() => onOpenModal('technicalData')}
            className="flex items-center text-xs font-semibold text-gray-700 transition hover:text-blue-700"
          >
            {t('configure.navbar.technicalData')}
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            onClick={() => onOpenModal('standardEquipment')}
            className="flex items-center text-xs font-semibold text-gray-700 transition hover:text-blue-700"
          >
            {t('configure.navbar.standardEquipment')}
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-5 xl:ml-0">
          <PriceBlock
            label={t('configure.navbar.adjustRental')}
            value={
              monthlyPrice != null
                ? formatPrice(monthlyPrice, locale, 2)
                : fallback
            }
            onClick={() => onOpenModal('finance')}
            icon={Calculator}
            suffix={t('configure.navbar.monthlySuffix')}
          />
          <PriceBlock
            label={t('configure.navbar.totalPrice')}
            value={
              totalPrice != null ? formatPrice(totalPrice, locale) : fallback
            }
            onClick={() => onOpenModal('priceOverview')}
          />
          <button
            type="button"
            onClick={() => onOpenModal('saveConfiguration')}
            className="rounded-sm bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {t('configure.navbar.saveConfiguration')}
          </button>
          <Bell size={18} className="text-gray-500" aria-hidden="true" />
        </div>
      </div>
    </header>
  )
}

export default ConfiguratorNavbar
