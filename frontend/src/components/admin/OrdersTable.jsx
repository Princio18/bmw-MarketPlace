import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'
import { formatPrice } from '@/lib/price'

function StatusBadge({ status }) {
  const { t } = useTranslation()
  const styles = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    expired: 'bg-zinc-200 text-zinc-700 dark:bg-gray-700 dark:text-gray-300',
  }
  return (
    <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-semibold ${styles[status] || styles.pending}`}>
      {t(`adminOrders.status.${status}`)}
    </span>
  )
}

function OrdersTable({ onRefund, refundMessageMap = {} }) {
  const { t } = useTranslation(['translation', 'admin'])
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [resendingId, setResendingId] = useState(null)
  const [messages, setMessages] = useState({})

  useEffect(() => {
    Promise.all([
      api.get('/admin/orders', { headers: { Authorization: `Bearer ${getAuthToken()}` } }),
      api.get('/admin/orders/summary', { headers: { Authorization: `Bearer ${getAuthToken()}` } }),
    ])
      .then(([ordersRes, summaryRes]) => {
        setOrders(ordersRes.data.orders)
        setSummary(summaryRes.data)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const handleResend = async (id) => {
    setResendingId(id)
    setMessages((prev) => ({ ...prev, [id]: null }))
    try {
      await api.post(
        `/admin/orders/${id}/resend-receipt`,
        {},
        { headers: { Authorization: `Bearer ${getAuthToken()}` } },
      )
      setMessages((prev) => ({ ...prev, [id]: { ok: true, text: t('adminOrders.resendSuccess') } }))
    } catch (err) {
      setMessages((prev) => ({
        ...prev,
        [id]: { ok: false, text: err.response?.data?.error || t('adminOrders.resendError') },
      }))
    } finally {
      setResendingId(null)
    }
  }

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString('en-GB') : '—'

  const summaryItems = [
    { label: t('adminOrders.totalRevenue'), value: summary ? formatPrice(summary.totalRevenue, 'en-GB') : '—' },
    { label: t('adminOrders.ordersThisMonth'), value: summary ? String(summary.ordersThisMonth) : '—' },
    { label: t('adminOrders.revenueThisMonth'), value: summary ? formatPrice(summary.revenueThisMonth, 'en-GB') : '—' },
  ]

  return (
    <div className="w-full">
      {loading && (
        <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('adminOrders.loading')}
        </p>
      )}

      {!loading && error && (
        <p className="py-16 text-center text-sm text-gray-600 dark:text-gray-300">
          {t('adminOrders.error')}
        </p>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
                <p className="font-manrope mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {orders.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('adminOrders.noOrders')}
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">{t('adminOrders.date')}</th>
                    <th className="px-5 py-3 font-medium">{t('adminOrders.buyer')}</th>
                    <th className="px-5 py-3 font-medium">{t('adminOrders.vehicle')}</th>
                    <th className="px-5 py-3 font-medium">{t('adminOrders.amount')}</th>
                    <th className="px-5 py-3 font-medium">{t('adminOrders.statusCol')}</th>
                    <th className="px-5 py-3 font-medium">{t('adminOrders.receipt')}</th>
                    <th className="px-5 py-3 font-medium">{t('adminOrders.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-gray-800">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-5 py-4 text-gray-700 dark:text-gray-200">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-gray-700 dark:text-gray-200">
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
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-4">
                        {order.receiptSentAt ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {t('adminOrders.receiptSent')}
                          </span>
                        ) : (
                          <span className="text-gray-400">{t('adminOrders.receiptNotSent')}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {order.status === 'paid' && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onRefund && onRefund(order)}
                              className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
                            >
                              {t('orders.refund')}
                            </button>
                            {order.status === 'paid' && (
                              <button
                                type="button"
                                onClick={() => handleResend(order.id)}
                                disabled={resendingId === order.id}
                                className="rounded border border-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-900 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-200 dark:text-white dark:hover:bg-gray-800"
                              >
                                {resendingId === order.id
                                  ? t('adminOrders.resending')
                                  : t('adminOrders.resend')}
                              </button>
                            )}
                          </div>
                        )}
                        {refundMessageMap[order.id] && (
                          <p
                            className={`mt-1 text-xs ${
                              refundMessageMap[order.id].ok
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {refundMessageMap[order.id].text}
                          </p>
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
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default OrdersTable