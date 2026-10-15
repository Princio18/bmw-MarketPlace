import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Clock, Loader2 } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ScrollToTopButton from '../components/layout/ScrollToTopButton'
import api from '../services/api'

const POLL_INTERVAL_MS = 2000
const MAX_ATTEMPTS = 10

function OrderConfirmation() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order')

  // 'success' = paiement confirmé, 'processing' = 10 tentatives sans confirmation,
  // 'confirming' = en cours de vérification. Sans `order`, on retombe sur l'état
  // de succès statique (rétrocompatibilité).
  const [state, setState] = useState(orderId ? 'confirming' : 'success')
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (!orderId) return undefined

    let cancelled = false
    let timer

    const poll = async () => {
      attemptsRef.current += 1
      try {
        const { data } = await api.get(`/orders/${orderId}`)
        if (cancelled) return
        if (data?.order?.status === 'paid') {
          setState('success')
          return
        }
      } catch {
        // erreur transitoire : on retente jusqu'au plafond
      }
      if (cancelled) return
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setState((prev) => (prev === 'success' ? prev : 'processing'))
        return
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS)
    }

    timer = setTimeout(poll, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [orderId])

  return (
    <div className="min-h-screen bg-background dark:bg-gray-950">
      <div className="relative h-[72px]">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 z-10 h-[120px] bg-gradient-to-b from-black/40 via-black/15 to-transparent"
        />
        <Navbar />
      </div>

      <main className="mx-auto flex w-[min(88vw,1500px)] flex-col items-center px-4 pb-24 pt-16 text-center md:px-8">
        {state === 'confirming' && (
          <>
            <Loader2 size={56} className="animate-spin text-bmw-blue" />
            <h1 className="font-manrope mt-6 text-4xl font-light uppercase tracking-tight text-gray-900 md:text-5xl dark:text-white">
              {t('orderConfirmation.confirming')}
            </h1>
          </>
        )}

        {state === 'processing' && (
          <>
            <Clock size={56} className="text-amber-500" />
            <h1 className="font-manrope mt-6 text-4xl font-light uppercase tracking-tight text-gray-900 md:text-5xl dark:text-white">
              {t('orderConfirmation.processing')}
            </h1>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle2 size={56} className="text-emerald-500" />
            <h1 className="font-manrope mt-6 text-4xl font-light uppercase tracking-tight text-gray-900 md:text-5xl dark:text-white">
              {t('orderConfirmation.title')}
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
              {t('orderConfirmation.message')}
            </p>
          </>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {state === 'success' && orderId && (
            <Link
              to={`/my-orders/${orderId}`}
              className="rounded-md bg-bmw-blue px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#00559a]"
            >
              {t('orderConfirmation.viewOrder')}
            </Link>
          )}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-md bg-gray-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {t('common.backHome')}
          </button>
        </div>
      </main>

      <Footer noTopBorder />
      <ScrollToTopButton />
    </div>
  )
}

export default OrderConfirmation
