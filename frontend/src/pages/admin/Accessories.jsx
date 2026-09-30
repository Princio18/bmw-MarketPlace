import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'
import { formatPrice } from '@/lib/price'
import { useAdminSearch } from '@/context/useAdminSearch'
import { useAuth } from '@/context/useAuth'
import ConfirmModal from '@/components/shared/ConfirmModal'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

function StockBadge({ accessory }) {
  const { t } = useTranslation('admin')
  if (accessory.deletedAt) {
    return (
      <span className="inline-block rounded-sm bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
        {t('accessories.removed')}
      </span>
    )
  }
  if (!accessory.inStock) {
    return (
      <span className="inline-block rounded-sm bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        {t('accessories.outOfStock')}
      </span>
    )
  }
  if (accessory.stockQuantity <= 3) {
    return (
      <span className="inline-block rounded-sm bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        {t('accessories.lowStock', { count: accessory.stockQuantity })}
      </span>
    )
  }
  return (
    <span className="inline-block rounded-sm bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
      {t('accessories.inStock')} · {accessory.stockQuantity}
    </span>
  )
}

function Accessories() {
  const { t, i18n } = useTranslation('admin')
  const lang = i18n.resolvedLanguage || i18n.language
  const navigate = useNavigate()
  const { query } = useAdminSearch()
  const { hasPermission } = useAuth()

  const [accessories, setAccessories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)

  const loadAccessories = useCallback(() => {
    api
      .get('/admin/accessories', authHeader)
      .then(({ data }) => {
        setError(false)
        setAccessories(Array.isArray(data?.accessories) ? data.accessories : [])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadAccessories()
  }, [loadAccessories])

  const handleRemove = () => {
    api
      .delete(`/admin/accessories/${removeTarget.id}`, authHeader)
      .catch(() => {})
      .finally(() => {
        setRemoveTarget(null)
        loadAccessories()
      })
  }

  const handleRestore = (id) => {
    api
      .put(`/admin/accessories/${id}/restore`, null, authHeader)
      .catch(() => {})
      .then(loadAccessories)
  }

  const filtered = accessories.filter((item) =>
    String(item.name).toLowerCase().includes(query.trim().toLowerCase()),
  )

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString(lang) : '—')

  if (!hasPermission('can_manage_vehicles')) {
    return (
      <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
        {t('accessories.noAccess')}
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-manrope text-2xl font-bold text-gray-900 dark:text-white">
          {t('accessories.title')}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/admin/accessories/new')}
          className="inline-flex items-center gap-2 rounded-md bg-bmw-blue px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
        >
          <Plus size={16} />
          {t('accessories.new')}
        </button>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('common.loading')}
        </p>
      ) : error ? (
        <p className="py-16 text-center text-sm text-red-600 dark:text-red-400">
          {t('common.error')}
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('accessories.empty')}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">{t('accessories.image')}</th>
                <th className="px-4 py-3">{t('accessories.name')}</th>
                <th className="px-4 py-3">{t('accessories.price')}</th>
                <th className="px-4 py-3">{t('accessories.stock')}</th>
                <th className="px-4 py-3">{t('accessories.status')}</th>
                <th className="px-4 py-3 text-right">{t('accessories.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((accessory) => (
                <tr
                  key={accessory.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-gray-800"
                >
                  <td className="px-4 py-3">
                    <img
                      src={accessory.image}
                      alt={accessory.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = '/images/placeholder-accessory.svg'
                      }}
                      className="h-12 w-16 rounded border border-zinc-200 bg-white object-contain dark:border-gray-700"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {accessory.name}
                    </p>
                    {accessory.badge && (
                      <span className="mt-1 inline-block rounded-sm bg-bmw-blue/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-bmw-blue">
                        {accessory.badge}
                      </span>
                    )}
                    {accessory.requiresAdjustment && (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                        {t('accessories.requiresAdjustment')}
                      </p>
                    )}
                    {accessory.description && (
                      <p className="mt-1 max-w-md truncate text-xs text-gray-500 dark:text-gray-400">
                        {accessory.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
                      {t('accessories.createdAt')} {formatDate(accessory.createdAt)}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                    {formatPrice(accessory.price, 'en-GB')}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">
                    {accessory.stockQuantity}
                  </td>
                  <td className="px-4 py-3">
                    <StockBadge accessory={accessory} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {accessory.deletedAt ? (
                        <button
                          type="button"
                          onClick={() => handleRestore(accessory.id)}
                          title={t('accessories.restore')}
                          aria-label={t('accessories.restore')}
                          className="rounded p-1.5 text-gray-500 transition hover:bg-zinc-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                        >
                          <RotateCcw size={16} />
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/admin/accessories/${accessory.id}/edit`)
                            }
                            title={t('accessories.edit')}
                            aria-label={t('accessories.edit')}
                            className="rounded p-1.5 text-gray-500 transition hover:bg-zinc-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRemoveTarget(accessory)}
                            title={t('accessories.remove')}
                            aria-label={t('accessories.remove')}
                            className="rounded p-1.5 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={Boolean(removeTarget)}
        title={t('accessories.removeTitle')}
        message={removeTarget ? t('accessories.removeMessage', { name: removeTarget.name }) : ''}
        confirmLabel={t('accessories.removeConfirm')}
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
        destructive
      />
    </div>
  )
}

export default Accessories
