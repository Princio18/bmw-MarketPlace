import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Clock } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ScrollToTopButton from '../components/layout/ScrollToTopButton'
import ReviewForm from '../components/orders/ReviewForm'
import api from '../services/api'
import { formatPrice } from '../lib/price'

const STEPS = ['paid', 'pending', 'ready', 'delivered']
const STEP_INDEX = { pending: 1, ready: 2, delivered: 3 }

function formatDate(value, locale) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(value, locale) {
  if (!value) return ''
  return new Date(value).toLocaleString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ProgressStepper({ processingStatus, cancelled, history, locale, t }) {
  if (cancelled) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        {t('orderTracking.cancelledBanner')}
      </div>
    )
  }

  const currentIndex = STEP_INDEX[processingStatus] ?? 1
  const dateFor = (status) => history.find((h) => h.status === status)?.at || null

  return (
    <ol className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      {STEPS.map((step, index) => {
        const done = index < currentIndex
        const current = index === currentIndex
        const at = dateFor(step)
        return (
          <li key={step} className="flex flex-1 items-start gap-3 md:flex-col md:items-center md:text-center">
            <div className="flex items-center gap-3 md:flex-col">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? 'bg-bmw-blue text-white'
                    : current
                      ? 'bg-bmw-blue text-white ring-4 ring-bmw-blue/25'
                      : 'bg-zinc-200 text-zinc-500 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {done ? <Check size={16} /> : current ? <Clock size={16} /> : index + 1}
              </span>
              <div className="md:mt-2">
                <p
                  className={`text-sm font-semibold ${
                    done || current
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {t(`orderTracking.steps.${step}`)}
                </p>
                {at && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(at, locale)}
                  </p>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function OrderTracking() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage === 'fr' ? 'fr-FR' : 'en-GB'

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    api
      .get(`/orders/${id}`)
      .then(({ data }) => setOrder(data.order))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [id])

  const lines = useMemo(
    () => (order?.priceBreakdown?.lines || []).filter((line) => line.counted !== false),
    [order],
  )

  const handleDownloadReceipt = async () => {
    setDownloading(true)
    try {
      const { data } = await api.get(`/orders/${id}/receipt`, { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = `receipt-${id.slice(0, 8)}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      // silencieux : le reçu n'est disponible qu'après paiement
    } finally {
      setDownloading(false)
    }
  }

  const cancelled = order?.processingStatus === 'cancelled'
  const canReview = order?.status === 'paid' && !order.hasReview && !reviewSubmitted

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
            {t('orderTracking.title')}
          </h1>
        </div>
      </header>

      <main className="mx-auto w-[min(88vw,1500px)] px-4 pb-24 pt-10 md:px-8">
        {loading && (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('orderTracking.loading')}
          </p>
        )}

        {!loading && (failed || !order) && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('orderTracking.error')}</p>
            <Link to="/my-orders" className="text-sm font-semibold text-bmw-blue hover:underline">
              {t('orderTracking.backToOrders')}
            </Link>
          </div>
        )}

        {!loading && order && (
          <div className="space-y-6">
            <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <ProgressStepper
                processingStatus={order.processingStatus}
                cancelled={cancelled}
                history={order.history || []}
                locale={locale}
                t={t}
              />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('orderTracking.vehicle')}
                </h2>
                <div className="mt-4 flex gap-4">
                  <img
                    src={order.image}
                    alt={order.modelName}
                    className="h-20 w-32 shrink-0 rounded-md border border-zinc-200 object-cover dark:border-gray-700"
                    onError={(e) => {
                      e.currentTarget.src = '/images/placeholder-vehicle.svg'
                    }}
                  />
                  <div className="min-w-0">
                    <p className="font-manrope text-lg font-semibold text-gray-900 dark:text-white">
                      {order.modelName}
                    </p>
                    {order.variantLabel && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {order.variantLabel}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t('orderTracking.reference')} : #{order.id.slice(0, 8)}
                    </p>
                  </div>
                </div>

                <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('orderTracking.handover')}
                </h2>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">{t('orderTracking.retailer')}</dt>
                    <dd className="text-right font-medium text-gray-900 dark:text-white">
                      {order.handover?.dealerName
                        ? `${order.handover.dealerName}${order.handover.dealerCity ? `, ${order.handover.dealerCity}` : ''}`
                        : t('orderTracking.toBeConfirmed')}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">
                      {t('orderTracking.handoverDate')}
                    </dt>
                    <dd className="text-right font-medium text-gray-900 dark:text-white">
                      {order.handover?.scheduledAt
                        ? formatDateTime(order.handover.scheduledAt, locale)
                        : t('orderTracking.toBeConfirmed')}
                    </dd>
                  </div>
                  {order.handover?.vin && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500 dark:text-gray-400">{t('orderTracking.vin')}</dt>
                      <dd className="text-right font-mono text-sm font-medium text-gray-900 dark:text-white">
                        {order.handover.vin}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('orderTracking.price')}
                </h2>
                <ul className="mt-4 space-y-2">
                  {lines.map((line) => (
                    <li
                      key={line.key}
                      className="flex items-baseline justify-between gap-4 text-sm"
                    >
                      <span className="text-gray-600 dark:text-gray-300">{line.label}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatPrice(line.amount, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-baseline justify-between border-t border-zinc-200 pt-4 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {t('orderTracking.total')}
                  </span>
                  <span className="font-manrope text-2xl font-semibold text-gray-900 dark:text-white">
                    {formatPrice(order.amount, locale)}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadReceipt}
                    disabled={downloading}
                    className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-bmw-blue hover:text-bmw-blue disabled:opacity-50 dark:border-gray-600 dark:text-gray-100"
                  >
                    {downloading
                      ? t('orderTracking.downloadingReceipt')
                      : t('orderTracking.downloadReceipt')}
                  </button>
                </div>

                {canReview && (
                  <ReviewForm
                    orderId={order.id}
                    vehicleId={order.vehicleId}
                    onSubmitted={() => setReviewSubmitted(true)}
                  />
                )}

                {(order.hasReview || reviewSubmitted) && (
                  <p className="mt-4 inline-block rounded-sm bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {t('myOrders.submitted')}
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      <Footer noTopBorder />
      <ScrollToTopButton />
    </div>
  )
}

export default OrderTracking
