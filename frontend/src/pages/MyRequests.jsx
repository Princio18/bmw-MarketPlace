import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ScrollToTopButton from '../components/layout/ScrollToTopButton'
import api from '../services/api'

const STATUS_STYLES = {
  new: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  contacted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  offer_sent:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  converted:
    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  closed: 'bg-zinc-200 text-zinc-700 dark:bg-gray-700 dark:text-gray-300',
}

function RequestStatusBadge({ status }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-block rounded-sm px-2 py-0.5 text-xs font-semibold ${
        STATUS_STYLES[status] || STATUS_STYLES.new
      }`}
    >
      {t(`myRequests.status.${status}`)}
    </span>
  )
}

function MyRequests() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage === 'fr' ? 'fr-FR' : 'en-GB'
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .get('/configuration-requests/mine')
      .then(({ data }) => setRequests(data.requests || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(locale) : ''

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
            {t('myRequests.title')}
          </h1>
        </div>
      </header>

      <main className="mx-auto w-[min(88vw,1500px)] px-4 pb-24 pt-10 md:px-8">
        {loading && (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('myRequests.loading')}
          </p>
        )}

        {!loading && error && (
          <p className="py-16 text-center text-sm text-gray-600 dark:text-gray-300">
            {t('myRequests.error')}
          </p>
        )}

        {!loading && !error && requests.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('myRequests.empty')}
            </p>
            <Link
              to="/all-models"
              className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {t('common.discoverNow')}
            </Link>
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <div className="space-y-4">
            {requests.map((request) => (
              <article
                key={request.id}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row">
                  <img
                    src={request.image}
                    alt={request.modelName}
                    className="h-24 w-40 shrink-0 rounded-md border border-zinc-200 object-cover dark:border-gray-700"
                    onError={(e) => {
                      e.currentTarget.src = '/images/placeholder-vehicle.svg'
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="font-manrope text-lg font-semibold text-gray-900 dark:text-white">
                          {request.modelName}
                        </h2>
                        {request.variantLabel && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {request.variantLabel}
                          </p>
                        )}
                      </div>
                      <RequestStatusBadge status={request.status} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
                      <span>
                        {t('myRequests.reference')} :{' '}
                        <strong className="text-gray-900 dark:text-white">
                          {request.ref}
                        </strong>
                      </span>
                      <span>
                        {t('myRequests.date')} : {formatDate(request.createdAt)}
                      </span>
                      {request.dealerName && (
                        <span>
                          {t('myRequests.dealer')} : {request.dealerName}
                          {request.dealerCity ? ` (${request.dealerCity})` : ''}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {request.offerId && (
                        <Link
                          to={`/offers/${request.offerId}`}
                          className="inline-block rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        >
                          {t('myRequests.viewOffer')}
                        </Link>
                      )}
                      <Link
                        to={`/configure/${request.vehicleId}/confirm-request`}
                        state={{ requestId: request.id }}
                        className="inline-block rounded-md bg-bmw-blue px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#00559a]"
                      >
                        {t('myRequests.editDetails')}
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <Footer noTopBorder />
      <ScrollToTopButton />
    </div>
  )
}

export default MyRequests
