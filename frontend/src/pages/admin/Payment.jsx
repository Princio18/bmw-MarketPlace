import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'
import { formatPrice } from '@/lib/price'
import { useAuth } from '@/context/useAuth'
import OrdersTable from '@/components/admin/OrdersTable'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { getErrorMessage } from '@/utils/getErrorMessage'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

function StripeBalanceCard() {
  const { t } = useTranslation('admin')
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/admin/payments/balance', authHeader)
      .then(({ data }) => setBalance(data))
      .catch(() => setBalance({ available_in: false }))
      .finally(() => setLoading(false))
  }, [])

  const available = balance?.available_in

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        {t('payment.stripeBalance.title')}
      </p>
      {loading ? (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('payment.stripeBalance.loading')}
        </p>
      ) : available ? (
        <dl className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('payment.stripeBalance.available')}
            </dt>
            <dd className="mt-1 font-manrope text-xl font-semibold text-gray-900 dark:text-white">
              {formatPrice(balance.available, 'en-GB')}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('payment.stripeBalance.pending')}
            </dt>
            <dd className="mt-1 font-manrope text-xl font-semibold text-gray-900 dark:text-white">
              {formatPrice(balance.pending, 'en-GB')}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('payment.stripeBalance.unavailable')}
        </p>
      )}
    </div>
  )
}

function Payment() {
  const { t } = useTranslation('admin')
  const { user } = useAuth()
  const [refundOrder, setRefundOrder] = useState(null)
  const [refundMessages, setRefundMessages] = useState({})

  const isSuperAdmin = user?.isSuperAdmin === true

  const handleConfirmRefund = async () => {
    if (!refundOrder) return
    const order = refundOrder
    setRefundOrder(null)
    setRefundMessages((prev) => ({ ...prev, [order.id]: null }))
    try {
      await api.post(`/admin/orders/${order.id}/refund`, {}, authHeader)
      setRefundMessages((prev) => ({
        ...prev,
        [order.id]: { ok: true, text: t('orders.refundInitiated') },
      }))
    } catch (err) {
      setRefundMessages((prev) => ({
        ...prev,
        [order.id]: { ok: false, text: getErrorMessage(err, t('common.error')) },
      }))
    }
  }

  return (
    <div>
      <h1 className="font-manrope text-2xl font-bold text-gray-900 dark:text-white">
        {t('payment.title')}
      </h1>

      {isSuperAdmin && (
        <div className="mt-6">
          <StripeBalanceCard />
        </div>
      )}

      <div className="mt-6">
        <OrdersTable onRefund={setRefundOrder} refundMessageMap={refundMessages} />
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

export default Payment
