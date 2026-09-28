import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'
import { formatPrice } from '@/lib/price'
import { useAdminSearch } from '@/context/useAdminSearch'
import ConfirmModal from '@/components/shared/ConfirmModal'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

const PROCESSING_OPTIONS = ['pending', 'ready', 'delivered', 'cancelled']
const DEFAULT_PAGE_SIZE = 50

const PAYMENT_BADGE_STYLES = {
  pending: 'bg-zinc-200 text-zinc-700 dark:bg-gray-700 dark:text-gray-300',
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
}

function PaymentBadge({ status }) {
  const { t } = useTranslation('admin')
  const labelKey = `orders.payment${status.charAt(0).toUpperCase()}${status.slice(1)}`
  return (
    <span
      className={`inline-block rounded-sm px-2 py-0.5 text-xs font-semibold ${
        PAYMENT_BADGE_STYLES[status] || PAYMENT_BADGE_STYLES.pending
      }`}
    >
      {t(labelKey)}
    </span>
  )
}

function Orders() {
  const { t, i18n } = useTranslation('admin')
  const lang = i18n.resolvedLanguage || i18n.language
  const { query } = useAdminSearch()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [refundOrder, setRefundOrder] = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [messages, setMessages] = useState({})

  useEffect(() => {
    api
      .get(`/admin/orders?pageSize=${DEFAULT_PAGE_SIZE}`, authHeader)
      .then(({ data }) => setOrders(data.orders || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const filtered = orders.filter((order) =>
    order.buyerEmail.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(lang) : '—'

  const handleProcessingChange = async (orderId, processingStatus) => {
    setProcessingId(orderId)
    setMessages((prev) => ({ ...prev, [orderId]: null }))
    try {
      await api.put(`/admin/orders/${orderId}/status`, { processingStatus }, authHeader)
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, processingStatus } : o)),
      )
    } catch (err) {
      setMessages((prev) => ({
        ...prev,
        [orderId]: { ok: false, text: err.response?.data?.error || t('common.error') },
      }))
    } finally {
      setProcessingId(null)
    }
  }

  const handleConfirmRefund = async () => {
    if (!refundOrder) return
    const order = refundOrder
    setRefundOrder(null)
    setMessages((prev) => ({ ...prev, [order.id]: null }))
    try {
      await api.post(`/admin/orders/${order.id}/refund`, {}, authHeader)
      setMessages((prev) => ({
        ...prev,
        [order.id]: { ok: true, text: t('orders.refundInitiated') },
      }))
    } catch (err) {
      setMessages((prev) => ({
        ...prev,
        [order.id]: {
          ok: false,
          text: err.response?.data?.error || t('common.error'),
        },
      }))
    }
  }

  return (
    <div>
      <h1 className="font-manrope text-2xl font-bold text-gray-900 dark:text-white">
        {t('orders.title')}
      </h1>

      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {loading ? (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('orders.loading')}
          </p>
        ) : error ? (
          <p className="py-16 text-center text-sm text-red-600 dark:text-red-400">
            {t('orders.error')}
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('orders.noOrders')}
          </p>
        ) : (
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">{t('orders.date')}</th>
                <th className="px-5 py-3 font-medium">{t('orders.client')}</th>
                <th className="px-5 py-3 font-medium">{t('orders.vehicle')}</th>
                <th className="px-5 py-3 font-medium">{t('orders.amount')}</th>
                <th className="px-5 py-3 font-medium">{t('orders.paymentStatus')}</th>
                <th className="px-5 py-3 font-medium">{t('orders.processingStatus')}</th>
                <th className="px-5 py-3 font-medium">{t('orders.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-gray-800">
              {filtered.map((order) => (
                <tr key={order.id}>
                  <td className="px-5 py-4 text-gray-700 dark:text-gray-200">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="max-w-[200px] truncate px-5 py-4 text-gray-700 dark:text-gray-200">
                    {order.buyerEmail}
                  </td>
                  <td className="px-5 py-4 text-gray-700 dark:text-gray-200">
                    {order.modelName}
                    {order.variantLabel ? ` — ${order.variantLabel}` : ''}
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">
                    {formatPrice(order.amount, 'en-GB')}
                  </td>
                  <td className="px-5 py-4">
                    <PaymentBadge status={order.status} />
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={order.processingStatus || 'pending'}
                      onChange={(e) => handleProcessingChange(order.id, e.target.value)}
                      disabled={processingId === order.id}
                      className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs text-gray-800 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    >
                      {PROCESSING_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {t(`orders.processing${status.charAt(0).toUpperCase()}${status.slice(1)}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    {order.status === 'paid' && (
                      <button
                        type="button"
                        onClick={() => setRefundOrder(order)}
                        className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
                      >
                        {t('orders.refund')}
                      </button>
                    )}
                    {messages[order.id] && (
                      <p
                        className={`mt-1 text-xs ${
                          messages[order.id].ok
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {messages[order.id].text}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        open={Boolean(refundOrder)}
        title={t('orders.refundTitle')}
        message={
          refundOrder
            ? t('orders.refundMessage', { amount: formatPrice(refundOrder.amount, 'en-GB') })
            : ''
        }
        confirmLabel={t('orders.refundConfirm')}
        onConfirm={handleConfirmRefund}
        onCancel={() => setRefundOrder(null)}
        destructive
      />
    </div>
  )
}

export default Orders