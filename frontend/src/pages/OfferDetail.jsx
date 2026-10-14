import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ScrollToTopButton from '../components/layout/ScrollToTopButton'
import api from '../services/api'
import { formatPrice } from '../lib/price'
import { getErrorMessage } from '../utils/getErrorMessage'

function OfferDetail() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language

  const [offer, setOffer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get(`/offers/${id}`)
      .then(({ data }) => setOffer(data.offer))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [id])

  const breakdown = offer?.priceBreakdown
  const lines = useMemo(
    () => (breakdown?.lines || []).filter((line) => line.counted !== false),
    [breakdown],
  )
  const warnings = useMemo(
    () => (breakdown?.lines || []).filter((line) => line.counted === false),
    [breakdown],
  )

  const deliveryText = () => {
    if (!offer) return ''
    const { deliveryWeeksMin: min, deliveryWeeksMax: max } = offer
    if (min != null && max != null) return t('offer.delivery', { min, max })
    if (min != null) return t('offer.deliveryFrom', { min })
    if (max != null) return t('offer.deliveryUpTo', { max })
    return ''
  }

  const handlePay = async () => {
    setPaying(true)
    setError('')
    try {
      const { data } = await api.post(`/offers/${id}/checkout`, { acceptTerms: true })
      window.location.href = data.url
    } catch (err) {
      const status = err?.response?.status
      setError(status === 409 ? t('offer.unavailable') : getErrorMessage(err, t('offer.payError')))
      setPaying(false)
    }
  }

  const validUntil =
    offer?.expiresAt &&
    new Date(offer.expiresAt).toLocaleDateString(lang, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  const isPayable = offer?.status === 'active'

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
            {t('offer.title')}
          </h1>
          {offer?.vehicle?.modelName && (
            <p className="mt-3 text-sm text-white/70">
              {t('offer.forVehicle', {
                model: [offer.vehicle.modelName, offer.vehicle.variantLabel]
                  .filter(Boolean)
                  .join(' '),
              })}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto w-[min(88vw,1500px)] px-4 pb-24 pt-10 md:px-8">
        {loading && (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('offer.loading')}
          </p>
        )}

        {!loading && (failed || !offer) && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('offer.error')}</p>
            <Link to="/my-requests" className="text-sm font-semibold text-bmw-blue hover:underline">
              {t('offer.backToRequests')}
            </Link>
          </div>
        )}

        {!loading && offer && (
          <div className="mx-auto max-w-3xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {!isPayable && (
              <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                {offer.status === 'accepted' ? t('offer.statusAccepted') : t('offer.unavailable')}
              </p>
            )}

            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('offer.lines')}
              </h2>
              {validUntil && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t('offer.validUntil', { date: validUntil })}
                </span>
              )}
            </div>

            <ul className="mt-4 space-y-2">
              {lines.map((line) => (
                <li key={line.key} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{line.label}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatPrice(line.amount, 'en-GB')}
                  </span>
                </li>
              ))}
            </ul>

            {warnings.length > 0 && (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                {warnings.map((line) => line.label).join(', ')} — {t('configure.section.outOfStock')}
              </p>
            )}

            <div className="mt-4 flex items-baseline justify-between border-t border-zinc-200 pt-4 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {t('offer.total')}
              </span>
              <span className="font-manrope text-3xl font-semibold text-gray-900 dark:text-white">
                {formatPrice(offer.totalAmount, 'en-GB')}
              </span>
            </div>

            {deliveryText() && (
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{deliveryText()}</p>
            )}

            {offer.notes && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('offer.notes')}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">
                  {offer.notes}
                </p>
              </div>
            )}

            {isPayable && (
              <>
                <label className="mt-6 flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5"
                  />
                  {t('offer.acceptTerms')}
                </label>

                <button
                  type="button"
                  onClick={handlePay}
                  disabled={!acceptTerms || paying}
                  className="mt-4 w-full rounded-md bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  {paying ? t('offer.paying') : t('offer.pay')}
                </button>

                {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
              </>
            )}
          </div>
        )}
      </main>

      <Footer noTopBorder />
      <ScrollToTopButton />
    </div>
  )
}

export default OfferDetail
