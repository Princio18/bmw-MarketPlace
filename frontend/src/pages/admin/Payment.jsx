import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'
import { formatPrice } from '@/lib/price'
import OrdersTable from '@/components/admin/OrdersTable'
import ConfirmModal from '@/components/shared/ConfirmModal'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

function Payment() {
  const { t } = useTranslation('admin')
  const [refundOrder, setRefundOrder] = useState(null)
  const [refundMessages, setRefundMessages] = useState({})

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
        [order.id]: { ok: false, text: err.response?.data?.error || t('common.error') },
      }))
    }
  }

  return (
    <div>
      <h1 className="font-manrope text-2xl font-bold text-gray-900 dark:text-white">
        {t('payment.title')}
      </h1>

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