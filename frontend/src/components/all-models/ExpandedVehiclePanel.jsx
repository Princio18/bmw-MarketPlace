import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import DrivetrainIcon from './DrivetrainIcon'
import { formatPrice } from '../../lib/price'
import api from '../../services/api'

const REVIEW_PAGE_SIZE = 6

async function fetchReviews(vehicleId, page) {
  const { data } = await api.get(`/vehicles/${vehicleId}/reviews`, {
    params: { page, pageSize: REVIEW_PAGE_SIZE },
  })
  return data
}

function StarRow({ value, size = 14 }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={
            n <= value
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300 dark:text-gray-600'
          }
        />
      ))}
    </span>
  )
}

function ExpandedVehiclePanel({ vehicle }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const locale = i18n.resolvedLanguage === 'fr' ? 'fr-FR' : 'en-GB'
  const drivetrainLabel = t(`allModels.drivetrains.${vehicle.drivetrain}`)
  const reviewCount = Number(vehicle.reviewCount) || 0
  const averageRating = Number(vehicle.averageRating)

  const [reviews, setReviews] = useState([])
  const [page, setPage] = useState(1)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [reviewsError, setReviewsError] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const loadReviews = useCallback(
    async (nextPage) => {
      if (nextPage > 1) setLoadingMore(true)
      try {
        const data = await fetchReviews(vehicle.id, nextPage)
        setReviewsError(false)
        setPage(nextPage)
        setReviews((prev) =>
          nextPage === 1 ? data.reviews : [...prev, ...data.reviews],
        )
        setHasMore(data.reviews.length === REVIEW_PAGE_SIZE)
      } catch {
        setReviewsError(true)
        setHasMore(false)
      } finally {
        setReviewsLoading(false)
        setLoadingMore(false)
      }
    },
    [vehicle.id],
  )

  useEffect(() => {
    let cancelled = false
    fetchReviews(vehicle.id, 1)
      .then((data) => {
        if (cancelled) return
        setReviews(data.reviews)
        setPage(1)
        setHasMore(data.reviews.length === REVIEW_PAGE_SIZE)
      })
      .catch(() => {
        if (cancelled) return
        setReviewsError(true)
        setHasMore(false)
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [vehicle.id])

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(locale) : ''

  return (
    <div className="col-span-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-gray-700 dark:bg-gray-900">
      <div className="grid gap-8 p-8 md:grid-cols-5 md:items-start">
        <div className="md:col-span-3">
          <h3 className="font-manrope text-2xl font-semibold text-gray-900 dark:text-white">
            {vehicle.modelName}
          </h3>
          {vehicle.variantLabel && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {vehicle.variantLabel}
            </p>
          )}
          <dl className="mt-6 grid max-w-md grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Spec label={t('allModels.specs.category')}>
              {vehicle.category}
            </Spec>
            <Spec label={t('allModels.specs.series')}>
              {t('allModels.series', { series: vehicle.series })}
            </Spec>
            <Spec label={t('allModels.specs.drivetrain')}>
              <span className="inline-flex items-center gap-1.5">
                <DrivetrainIcon drivetrain={vehicle.drivetrain} className="text-gray-500" />
                {drivetrainLabel}
              </span>
            </Spec>
            <Spec label={t('allModels.specs.variant')}>
              {vehicle.isNew
                ? t('allModels.newArrival')
                : t('allModels.specs.currentModel')}
            </Spec>
            {vehicle.isMPerformance && (
              <Spec label={t('allModels.specs.performance')}>
                {t('allModels.specs.mPerformance')}
              </Spec>
            )}
          </dl>
        </div>

        <div className="md:col-span-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('allModels.priceFrom')}
          </p>
          <p className="font-manrope mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
            {vehicle.basePrice != null
              ? formatPrice(vehicle.basePrice, locale)
              : t('allModels.priceOnRequest')}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {t('allModels.excludingOptions')}
          </p>

          {reviewCount > 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-sm">
              <Star size={16} className="fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-gray-900 dark:text-white">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                ({reviewCount})
              </span>
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => navigate(`/configure/${vehicle.id}`)}
              className="rounded-md bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {t('allModels.buildAndPrice')}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/vehicles/${vehicle.id}`)}
              className="rounded-md border border-gray-900 px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 dark:border-gray-200 dark:text-white dark:hover:bg-gray-800"
            >
              {t('allModels.requestOffer')}
            </button>
          </div>
        </div>
      </div>

      <section className="border-t border-zinc-200 p-8 dark:border-gray-700">
        <h4 className="font-manrope text-lg font-semibold text-gray-900 dark:text-white">
          {t('allModels.reviews.title')}
          {reviewCount > 0 && (
            <span className="ml-2 text-sm font-medium text-gray-400">
              ({reviewCount})
            </span>
          )}
        </h4>

        {reviewsLoading && page === 1 ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {t('allModels.loading')}
          </p>
        ) : reviewsError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            {t('allModels.error')}
          </p>
        ) : reviews.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {t('allModels.reviews.noReviews')}
          </p>
        ) : (
          <ul className="mt-4 grid gap-5 md:grid-cols-2">
            {reviews.map((review, index) => (
              <li
                key={`${review.createdAt}-${index}`}
                className="rounded-md border border-zinc-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <StarRow value={review.rating} />
                  <span className="rounded-sm bg-gray-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {t('allModels.reviews.verified')}
                  </span>
                </div>
                {review.comment && (
                  <p className="mt-3 text-sm text-gray-800 dark:text-gray-200">
                    {review.comment}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  {formatDate(review.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}

        {hasMore && (
          <button
            type="button"
            onClick={() => loadReviews(page + 1)}
            disabled={loadingMore}
            className="mt-5 rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {t('allModels.reviews.loadMore')}
          </button>
        )}
      </section>
    </div>
  )
}

function Spec({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 text-gray-800 dark:text-gray-200">{children}</dd>
    </div>
  )
}

export default ExpandedVehiclePanel