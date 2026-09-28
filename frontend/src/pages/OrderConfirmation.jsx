import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ScrollToTopButton from '../components/layout/ScrollToTopButton'

function OrderConfirmation() {
  const navigate = useNavigate()
  const { t } = useTranslation()

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
        <CheckCircle2 size={56} className="text-emerald-500" />
        <h1 className="font-manrope mt-6 text-4xl font-light uppercase tracking-tight text-gray-900 md:text-5xl dark:text-white">
          {t('orderConfirmation.title')}
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
          {t('orderConfirmation.message')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-8 rounded-md bg-gray-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {t('common.backHome')}
        </button>
      </main>

      <Footer noTopBorder />
      <ScrollToTopButton />
    </div>
  )
}

export default OrderConfirmation