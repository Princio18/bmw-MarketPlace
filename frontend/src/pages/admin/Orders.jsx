import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'
import { formatPrice } from '@/lib/price'
import { useAdminSearch } from '@/context/useAdminSearch'
import ConfirmModal from '@/components/shared/ConfirmModal'
import OrderStatusModal from '@/components/admin/OrderStatusModal'
import { getErrorMessage } from '@/utils/getErrorMessage'
import { X } from 'lucide-react'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }
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

function ProcessingBadge({ status }) {
  const { t } = useTranslation('admin')
  const key = status?.charAt(0).toUpperCase() + status?.slice(1)
  return (
    <span className="inline-block rounded-sm border border-zinc-300 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">
      {t(`orders.processing${key}`)}
    </span>
  )
}

function OrderDetailModal({ orderId, onClose }) {
  const { t, i18n } = useTranslation('admin')
  const lang = i18n.resolvedLanguage || i18n.language
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .get(`/admin/orders/${orderId}`, authHeader)
      .then(({ data: res }) => setData(res))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [orderId])

  const fmt = (value) => (value ? new Date(value).toLocaleString(lang) : '—')
  const order = data?.order

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('orders.detailTitle', { ref: orderId.slice(0, 8) })}
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('orders.detailTitle', { ref: orderId.slice(0, 8) })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('orders.close')}
            className="text-gray-400 transition hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        {loading && (
          <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('orders.loading')}
          </p>
        )}
        {!loading && (error || !order) && (
          <p className="py-10 text-center text-sm text-red-600 dark:text-red-400">
            {t('orders.error')}
          </p>
        )}

        {!loading && order && (
          <div className="mt-4 space-y-5 text-sm">
            <div className="flex flex-wrap gap-2">
              <PaymentBadge status={order.status} />
              <ProcessingBadge status={order.processingStatus} />
            </div>

            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('orders.client')}
                </dt>
                <dd className="text-gray-900 dark:text-white">{order.buyerEmail}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('orders.vehicle')}
                </dt>
                <dd className="text-gray-900 dark:text-white">
                  {order.modelName}
                  {order.variantLabel ? ` — ${order.variantLabel}` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('orders.amount')}
                </dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {formatPrice(order.amount, 'en-GB')}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('orders.handover')}
                </dt>
                <dd className="text-gray-900 dark:text-white">
                  {order.dealerName
                    ? `${order.dealerName}${order.dealerCity ? `, ${order.dealerCity}` : ''}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('orders.handoverDate')}
                </dt>
                <dd className="text-gray-900 dark:text-white">{fmt(order.scheduledHandoverAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('orders.vin')}
                </dt>
                <dd className="font-mono text-gray-900 dark:text-white">{order.vin || '—'}</dd>
              </div>
            </dl>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('orders.historyTitle')}
              </h3>
              {data.history?.length ? (
                <ol className="mt-3 space-y-3 border-l border-zinc-200 pl-4 dark:border-gray-700">
                  {data.history.map((entry, index) => (
                    <li key={index} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-bmw-blue" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {t(`orders.processing${entry.status.charAt(0).toUpperCase()}${entry.status.slice(1)}`, {
                          defaultValue: entry.status,
                        })}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {fmt(entry.at)}
                        {entry.changedByEmail
                          ? ` · ${t('orders.changedBy', { email: entry.changedByEmail })}`
                          : ''}
                      </p>
                      {entry.note && (
                        <p className="mt-1 whitespace-pre-line text-xs text-gray-600 dark:text-gray-300">
                          {entry.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t('orders.historyEmpty')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
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
  const [statusOrder, setStatusOrder] = useState(null)
  const [detailOrderId, setDetailOrderId] = useState(null)
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

  const handleStatusUpdated = (orderId, processingStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, processingStatus } : o)),
    )
    setStatusOrder(null)
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
          text: getErrorMessage(err, t('common.error')),
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
                    <ProcessingBadge status={order.processingStatus} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailOrderId(order.id)}
                        className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-bmw-blue hover:text-bmw-blue dark:border-gray-600 dark:text-gray-200"
                      >
                        {t('orders.viewDetail')}
                      </button>
                      {order.status === 'paid' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setStatusOrder(order)}
                            className="rounded border border-bmw-blue px-3 py-1.5 text-xs font-semibold text-bmw-blue transition hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          >
                            {t('orders.updateStatus')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRefundOrder(order)}
                            className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
                          >
                            {t('orders.refund')}
                          </button>
                        </>
                      )}
                    </div>
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

      {statusOrder && (
        <OrderStatusModal
          order={statusOrder}
          onClose={() => setStatusOrder(null)}
          onUpdated={(processingStatus) => handleStatusUpdated(statusOrder.id, processingStatus)}
        />
      )}

      {detailOrderId && (
        <OrderDetailModal orderId={detailOrderId} onClose={() => setDetailOrderId(null)} />
      )}

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
