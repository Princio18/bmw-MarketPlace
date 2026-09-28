import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Package, ShoppingBag, Heart } from 'lucide-react'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'
import { formatPrice } from '@/lib/price'
import { useAdminSearch } from '@/context/useAdminSearch'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

function StatusPill({ status }) {
  const { t } = useTranslation('admin')
  const styles = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    expired: 'bg-zinc-200 text-zinc-700 dark:bg-gray-700 dark:text-gray-300',
    refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  }
  return (
    <span
      className={`inline-block rounded-sm px-2 py-0.5 text-xs font-semibold ${
        styles[status] || styles.pending
      }`}
    >
      {t(`orders.payment${status.charAt(0).toUpperCase()}${status.slice(1)}`)}
    </span>
  )
}

function ClientDetail({ clientData, onClose }) {
  const { t, i18n } = useTranslation('admin')
  const lang = i18n.resolvedLanguage || i18n.language

  if (!clientData) return null
  const { client, orders, cart, favorites } = clientData

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(lang) : '—'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-zinc-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('clients.detailTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded p-1.5 text-gray-500 hover:bg-zinc-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-1 truncate text-sm font-medium text-bmw-blue">{client.email}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Heart size={13} />
          {t('clients.registeredAt')} : {formatDate(client.createdAt)}
        </p>

        <section className="mt-6">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Package size={15} />
            {t('clients.orders')}
          </h3>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('clients.noOrders')}</p>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="rounded border border-zinc-200 p-3 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {order.modelName}
                    </p>
                    <StatusPill status={order.status} />
                  </div>
                  {order.variantLabel && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {order.variantLabel}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {t('clients.amount')} : {formatPrice(order.amount, 'en-GB')}
                    </span>
                    <span>
                      {order.hasReview ? t('clients.reviewed') : t('clients.notReviewed')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <ShoppingBag size={15} />
            {t('clients.cart')}
          </h3>
          {!cart ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('clients.noCart')}</p>
          ) : (
            <div className="rounded border border-zinc-200 p-3 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{cart.modelName}</p>
              <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{formatPrice(cart.basePrice, 'en-GB')}</span>
                <span>{formatDate(cart.updatedAt)}</span>
              </div>
              {cart.configurationData && (
                <p className="mt-2 break-words text-xs text-gray-500 dark:text-gray-400">
                  {typeof cart.configurationData === 'string'
                    ? cart.configurationData
                    : JSON.stringify(cart.configurationData)}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="mt-6">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Heart size={15} />
            {t('clients.favorites')}
          </h3>
          {favorites.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('clients.noFavorites')}</p>
          ) : (
            <ul className="space-y-2">
              {favorites.map((fav) => (
                <li
                  key={fav.id}
                  className="flex items-center justify-between gap-2 rounded border border-zinc-200 p-2.5 text-sm dark:border-gray-700"
                >
                  <span className="truncate font-medium text-gray-900 dark:text-white">
                    {fav.modelName}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                    {formatPrice(fav.basePrice, 'en-GB')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </>
  )
}

function Clients() {
  const { t, i18n } = useTranslation('admin')
  const lang = i18n.resolvedLanguage || i18n.language
  const { query } = useAdminSearch()

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    api
      .get('/admin/clients', authHeader)
      .then(({ data }) => setClients(data.clients || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (id) => {
    setSelected(id)
    setDetail(null)
    try {
      const { data } = await api.get(`/admin/clients/${id}`, authHeader)
      setDetail(data)
    } catch {
      setDetail(null)
    }
  }

  const filtered = clients.filter((client) =>
    client.email.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(lang) : '—'

  return (
    <div>
      <h1 className="font-manrope text-2xl font-bold text-gray-900 dark:text-white">
        {t('clients.title')}
      </h1>

      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {loading ? (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('clients.loading')}
          </p>
        ) : error ? (
          <p className="py-16 text-center text-sm text-red-600 dark:text-red-400">
            {t('clients.error')}
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('clients.noClients')}
          </p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">{t('clients.email')}</th>
                <th className="px-5 py-3 font-medium">{t('clients.registeredAt')}</th>
                <th className="px-5 py-3 font-medium">{t('clients.nbOrders')}</th>
                <th className="px-5 py-3 font-medium">{t('clients.totalSpent')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-gray-800">
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => handleSelect(client.id)}
                  className="cursor-pointer transition hover:bg-zinc-50 dark:hover:bg-gray-800"
                >
                  <td className="px-5 py-4 font-medium text-bmw-blue">{client.email}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-gray-200">
                    {formatDate(client.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-gray-700 dark:text-gray-200">
                    {Number(client.orderCount).toLocaleString(lang)}
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">
                    {formatPrice(client.totalSpent, 'en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && detail && (
        <ClientDetail
          clientData={detail}
          onClose={() => {
            setSelected(null)
            setDetail(null)
          }}
        />
      )}
    </div>
  )
}

export default Clients