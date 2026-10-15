import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ScrollToTopButton from '../components/layout/ScrollToTopButton'
import ReviewForm from '../components/orders/ReviewForm'
import api from '../services/api'
import { getAuthToken } from '../lib/authToken'
import { formatPrice } from '../lib/price'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

function PaymentPill({ status }) {
  const { t } = useTranslation()
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
      {t(`myOrders.status.payment${status.charAt(0).toUpperCase()}${status.slice(1)}`)}
    </span>
  )
}

function ProcessingBadge({ status }) {
  const { t } = useTranslation()
  return (
    <span className="inline-block rounded-sm border border-zinc-300 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300">
      {t(`myOrders.status.processing${status.charAt(0).toUpperCase()}${status.slice(1)}`)}
    </span>
  )
}

function MyOrders() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage === 'fr' ? 'fr-FR' : 'en-GB'
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [submittedOrderIds, setSubmittedOrderIds] = useState([])

  useEffect(() => {
    api
      .get('/orders/mine', authHeader)
      .then(({ data }) => setOrders(data.orders || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(locale) : ''

  const hasReview = (order) => order.hasReview || submittedOrderIds.includes(order.id)

  return (
    <div className="min-h-screen bg-background dark:bg-gray-950">
      <header className="relative overflow-hidden bg-bmw-dark">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,102,177,0.35),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(0,102,177,0.2),transparent_60%)]"
        />
        <Navbar />
        <div className="relative mx-auto w-[min(88vw,1500px)] px-4 pb-12 pt-32 md:px-8">
          <h1 className="font-manrope text-4xl font-extralight uppercase tracking-tight text-white md:text-5xl md:leading-tight">
            {t('myOrders.title')}
          </h1>
        </div>
      </header>

      <main className="mx-auto w-[min(88vw,1500px)] px-4 pb-24 pt-10 md:px-8">
        {loading && (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('myOrders.loading')}
          </p>
        )}

        {!loading && error && (
          <p className="py-16 text-center text-sm text-gray-600 dark:text-gray-300">
            {t('myOrders.error')}
          </p>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('myOrders.empty')}
            </p>
            <Link
              to="/all-models"
              className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {t('common.discoverNow')}
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => {
              const alreadyReviewed = hasReview(order)
              const canReview = order.status === 'paid' && !alreadyReviewed
              return (
                <article
                  key={order.id}
                  className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:border-bmw-blue dark:border-gray-700 dark:bg-gray-900 dark:hover:border-bmw-blue"
                >
                  <div className="p-5">
                    <Link
                      to={`/my-orders/${order.id}`}
                      className="flex flex-col gap-4 sm:flex-row"
                    >
                      <img
                        src={order.image}
                        alt={order.modelName}
                        className="h-24 w-40 shrink-0 rounded-md border border-zinc-200 object-cover dark:border-gray-700"
                        onError={(e) => {
                          e.currentTarget.src = '/images/placeholder-vehicle.svg'
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h2 className="font-manrope text-lg font-semibold text-gray-900 dark:text-white">
                              {order.modelName}
                            </h2>
                            {order.variantLabel && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {order.variantLabel}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <ProcessingBadge status={order.processingStatus} />
                            <PaymentPill status={order.status} />
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
                          <span>
                            {t('myOrders.amount')} :{' '}
                            <strong className="text-gray-900 dark:text-white">
                              {formatPrice(order.amount, locale)}
                            </strong>
                          </span>
                          <span>
                            {t('myOrders.date')} : {formatDate(order.createdAt)}
                          </span>
                        </div>

                        <span className="mt-3 inline-block text-sm font-semibold text-bmw-blue">
                          {t('myOrders.viewOrder')} →
                        </span>
                      </div>
                    </Link>

                    {canReview && (
                      <ReviewForm
                        orderId={order.id}
                        vehicleId={order.vehicleId}
                        onSubmitted={() =>
                          setSubmittedOrderIds((prev) => [...prev, order.id])
                        }
                      />
                    )}

                    {alreadyReviewed && (
                      <p className="mt-4 inline-block rounded-sm bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {t('myOrders.submitted')}
                      </p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      <Footer noTopBorder />
      <ScrollToTopButton />
    </div>
  )
}

export default MyOrders