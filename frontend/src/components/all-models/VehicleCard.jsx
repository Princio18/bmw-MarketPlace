import { useTranslation } from 'react-i18next'
import { ChevronDown, Star } from 'lucide-react'
import DrivetrainIcon from './DrivetrainIcon'
import { formatPrice } from '../../lib/price'

function PlaceholderImage({ modelName, drivetrain }) {
  return (
    <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-bmw-dark via-[#16345c] to-bmw-blue">
      <div className="flex flex-col items-center gap-3 px-4 text-center">
        <DrivetrainIcon drivetrain={drivetrain} size={40} className="text-white/70" />
        <p className="font-manrope text-sm font-semibold uppercase tracking-wide text-white/80">
          {modelName}
        </p>
      </div>
    </div>
  )
}

function VehicleCard({ vehicle, expanded, onToggle }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage === 'fr' ? 'fr-FR' : 'en-GB'
  const drivetrainLabel = t(`allModels.drivetrains.${vehicle.drivetrain}`)

  return (
    <article
      onClick={onToggle}
      aria-expanded={expanded}
      className={`group cursor-pointer overflow-hidden rounded-lg border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-900 ${
        expanded ? 'border-black dark:border-white' : 'border-zinc-200 dark:border-gray-700'
      }`}
    >
      <div className="relative overflow-hidden">
        {vehicle.image ? (
          <img
            src={vehicle.image}
            alt={vehicle.modelName}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = '/images/placeholder-vehicle.svg'
            }}
            className="aspect-video w-full object-cover"
          />
        ) : (
          <PlaceholderImage
            modelName={vehicle.modelName}
            drivetrain={vehicle.drivetrain}
          />
        )}
        {vehicle.isNew && (
          <span className="absolute left-3 top-3 rounded-sm bg-bmw-blue px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            {t('allModels.newArrival')}
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-manrope text-xl font-semibold text-gray-900 dark:text-white">
            {vehicle.modelName}
          </h3>
          <span title={drivetrainLabel}>
            <DrivetrainIcon
              drivetrain={vehicle.drivetrain}
              className="mt-1 text-gray-400 dark:text-gray-300"
            />
          </span>
        </div>

        {vehicle.variantLabel && (
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {vehicle.variantLabel}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <span>{vehicle.category}</span>
          <span aria-hidden="true">•</span>
          <span>{t('allModels.series', { series: vehicle.series })}</span>
          {vehicle.isMPerformance && (
            <span className="rounded-sm bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold text-white dark:bg-gray-200 dark:text-gray-900">
              M
            </span>
          )}
        </div>

        {Number(vehicle.reviewCount) > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-sm">
            <Star size={15} className="fill-yellow-400 text-yellow-400" />
            <span className="font-semibold text-gray-900 dark:text-white">
              {Number(vehicle.averageRating).toFixed(1)}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              ({Number(vehicle.reviewCount)})
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-gray-800">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {vehicle.basePrice != null
              ? formatPrice(vehicle.basePrice, locale)
              : t('allModels.priceOnRequest')}
          </p>
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform duration-300 dark:text-gray-300 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>
    </article>
  )
}

export default VehicleCard