import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, Plus, RotateCcw, Star, Trash2, X } from 'lucide-react'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'
import { formatPrice } from '@/lib/price'
import { useAdminSearch } from '@/context/useAdminSearch'
import { useAuth } from '@/context/useAuth'
import ConfirmModal from '@/components/shared/ConfirmModal'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

function Stars({ rating }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={
            n <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300 dark:text-gray-600'
          }
        />
      ))}
    </span>
  )
}

function VehicleStatus({ removed }) {
  const { t } = useTranslation('admin')
  return removed ? (
    <span className="inline-block rounded-sm bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
      {t('vehicles.removed')}
    </span>
  ) : (
    <span className="inline-block rounded-sm bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
      {t('vehicles.active')}
    </span>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-bmw-blue text-white'
          : 'text-gray-700 hover:bg-zinc-100 dark:text-gray-200 dark:hover:bg-gray-800'
      }`}
    >
      {children}
    </button>
  )
}

function Vehicles() {
  const { t, i18n } = useTranslation('admin')
  const lang = i18n.resolvedLanguage || i18n.language
  const navigate = useNavigate()
  const { query } = useAdminSearch()
  const { hasPermission } = useAuth()

  const canManageVehicles = hasPermission('can_manage_vehicles')
  const canManageReviews = hasPermission('can_manage_reviews')
  const noAccess = !canManageVehicles && !canManageReviews

  const [tab, setTab] = useState(() => (canManageVehicles ? 'catalog' : 'reviews'))

  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)

  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewsError, setReviewsError] = useState(false)
  const [statusFilter, setStatusFilter] = useState('pending')

  const loadVehicles = useCallback(() => {
    api
      .get('/admin/vehicles', authHeader)
      .then(({ data }) => {
        setError(false)
        setVehicles(data)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'catalog') loadVehicles()
  }, [tab, loadVehicles])

  const loadReviews = useCallback(() => {
    const params = statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {}
    api
      .get('/admin/reviews', { ...authHeader, params })
      .then(({ data }) => {
        setReviewsError(false)
        setReviews(data.reviews || [])
      })
      .catch(() => setReviewsError(true))
      .finally(() => setReviewsLoading(false))
  }, [statusFilter])

  useEffect(() => {
    if (tab === 'reviews') loadReviews()
  }, [tab, statusFilter, loadReviews])

  const handleRemove = () => {
    api
      .delete(`/admin/vehicles/${removeTarget.id}`, authHeader)
      .catch(() => {})
      .finally(() => {
        setRemoveTarget(null)
        loadVehicles()
      })
  }

  const handleRestore = (id) => {
    api
      .put(`/admin/vehicles/${id}/restore`, null, authHeader)
      .catch(() => {})
      .then(loadVehicles)
  }

  const handleReviewStatus = (id, status) => {
    api
      .put(`/admin/reviews/${id}/status`, { status }, authHeader)
      .catch(() => {})
      .then(loadReviews)
  }

  const filteredVehicles = vehicles.filter((v) =>
    v.modelName.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(lang) : '—'

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-manrope text-2xl font-bold text-gray-900 dark:text-white">
          {t('vehicles.title')}
        </h1>
        {canManageVehicles && (
          <button
            type="button"
            onClick={() => navigate('/admin/vehicles/new')}
            className="inline-flex items-center gap-2 rounded-md bg-bmw-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00559a]"
          >
            <Plus size={16} />
            {t('vehicles.add')}
          </button>
        )}
      </div>

      {noAccess ? (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-16 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          {t('vehicles.noAccess')}
        </div>
      ) : (
        <>
          <div className="mt-6 flex gap-2">
            {canManageVehicles && (
              <TabButton active={tab === 'catalog'} onClick={() => setTab('catalog')}>
                {t('vehicles.catalogTab')}
              </TabButton>
            )}
            {canManageReviews && (
              <TabButton active={tab === 'reviews'} onClick={() => setTab('reviews')}>
                {t('vehicles.reviewsTab')}
              </TabButton>
            )}
          </div>

          {tab === 'catalog' ? (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {loading ? (
            <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('vehicles.loading')}
            </p>
          ) : error ? (
            <p className="py-16 text-center text-sm text-red-600 dark:text-red-400">
              {t('vehicles.error')}
            </p>
          ) : filteredVehicles.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('vehicles.noResults')}
            </p>
          ) : (
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('vehicles.image')}</th>
                  <th className="px-5 py-3 font-medium">{t('vehicles.model')}</th>
                  <th className="px-5 py-3 font-medium">{t('vehicles.category')}</th>
                  <th className="px-5 py-3 font-medium">{t('vehicles.drivetrain')}</th>
                  <th className="px-5 py-3 font-medium">{t('vehicles.price')}</th>
                  <th className="px-5 py-3 font-medium">{t('vehicles.status')}</th>
                  <th className="px-5 py-3 font-medium">{t('vehicles.interest')}</th>
                  <th className="px-5 py-3 font-medium">{t('vehicles.addedBy')}</th>
                  <th className="px-5 py-3 font-medium">{t('vehicles.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-gray-800">
                {filteredVehicles.map((v) => (
                  <tr key={v.id} className="transition hover:bg-zinc-50 dark:hover:bg-gray-800">
                    <td className="px-5 py-4">
                      <img
                        src={v.image}
                        alt={v.modelName}
                        className="h-10 w-16 rounded border border-zinc-200 object-cover dark:border-gray-700"
                        onError={(e) => {
                          e.currentTarget.src = '/images/placeholder-vehicle.svg'
                        }}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{v.modelName}</p>
                      {v.variantLabel && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{v.variantLabel}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-200">{v.category}</td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-200">
                      {t(`drivetrains.${v.drivetrain}`)}
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">
                      {v.basePrice != null ? formatPrice(v.basePrice, lang) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <VehicleStatus removed={Boolean(v.deletedAt)} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex flex-col text-gray-700 dark:text-gray-200">
                        <span>
                          {v.favoritesCount ?? 0} {t('vehicles.favorites')}
                        </span>
                        <span>
                          {v.activeCartsCount ?? 0} {t('vehicles.inCart')}
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-200">
                      {v.createdByEmail || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title={t('vehicles.edit')}
                          onClick={() => navigate(`/admin/vehicles/${v.id}/edit`)}
                          className="rounded p-1.5 text-gray-600 transition hover:bg-zinc-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                        >
                          <Pencil size={15} />
                        </button>
                        {v.deletedAt ? (
                          <button
                            type="button"
                            title={t('vehicles.restore')}
                            onClick={() => handleRestore(v.id)}
                            className="rounded p-1.5 text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
                          >
                            <RotateCcw size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            title={t('vehicles.remove')}
                            onClick={() => setRemoveTarget(v)}
                            className="rounded p-1.5 text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('reviews.status')} :
            </span>
            {['all', 'pending', 'published', 'rejected'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === value
                    ? 'bg-bmw-blue text-white'
                    : 'text-gray-700 hover:bg-zinc-100 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                {t(`reviews.${value}`)}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {reviewsLoading ? (
              <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('reviews.loading')}
              </p>
            ) : reviewsError ? (
              <p className="py-16 text-center text-sm text-red-600 dark:text-red-400">
                {t('reviews.error')}
              </p>
            ) : reviews.length === 0 ? (
              <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('reviews.noReviews')}
              </p>
            ) : (
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">{t('reviews.client')}</th>
                    <th className="px-5 py-3 font-medium">{t('reviews.vehicle')}</th>
                    <th className="px-5 py-3 font-medium">{t('reviews.rating')}</th>
                    <th className="px-5 py-3 font-medium">{t('reviews.comment')}</th>
                    <th className="px-5 py-3 font-medium">{t('reviews.date')}</th>
                    <th className="px-5 py-3 font-medium">{t('vehicles.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-gray-800">
                  {reviews.map((review) => (
                    <tr key={review.id} className="transition hover:bg-zinc-50 dark:hover:bg-gray-800">
                      <td className="px-5 py-4 font-medium text-bmw-blue">
                        {review.buyerEmail}
                      </td>
                      <td className="px-5 py-4 text-gray-700 dark:text-gray-200">
                        {review.modelName}
                        {review.variantLabel && (
                          <span className="text-gray-400"> — {review.variantLabel}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Stars rating={review.rating} />
                      </td>
                      <td className="max-w-[280px] px-5 py-4 text-gray-700 dark:text-gray-200">
                        <span className="line-clamp-2">{review.comment || '—'}</span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                        {formatDate(review.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        {review.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleReviewStatus(review.id, 'published')
                              }
                              className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
                            >
                              <Check size={13} />
                              {t('reviews.approve')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewStatus(review.id, 'rejected')}
                              className="inline-flex items-center gap-1 rounded bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
                            >
                              <X size={13} />
                              {t('reviews.reject')}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {t(`reviews.${review.status}`)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

        </>
      )}

      <ConfirmModal
        open={Boolean(removeTarget)}
        title={t('vehicles.removeTitle')}
        message={t('vehicles.removeMessage', { name: removeTarget?.modelName || '' })}
        confirmLabel={t('vehicles.remove')}
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
        destructive
      />
    </div>
  )
}

export default Vehicles