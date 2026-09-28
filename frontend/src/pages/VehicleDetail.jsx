import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ScrollToTopButton from '../components/layout/ScrollToTopButton'
import api from '../services/api'

function VehicleDetail() {
  const { id } = useParams()
  const { t } = useTranslation()
  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .get(`/vehicles/${id}`)
      .then(({ data }) => setVehicle(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="min-h-screen bg-background dark:bg-gray-950">
      <header className="relative overflow-hidden bg-bmw-dark">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,102,177,0.35),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(0,102,177,0.2),transparent_60%)]"
        />
        <Navbar />
        <div className="relative mx-auto w-[min(88vw,1500px)] px-4 pb-14 pt-32 md:px-8">
          <h1 className="font-manrope text-4xl font-extralight tracking-tight text-white md:text-5xl md:leading-tight">
            {vehicle ? vehicle.modelName : 'BMW'}
          </h1>
          {vehicle && vehicle.variantLabel && (
            <p className="mt-2 text-sm uppercase tracking-wide text-white/60">
              {vehicle.variantLabel}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-[min(88vw,1500px)] flex-col items-center px-4 pb-24 pt-20 text-center md:px-8">
        {loading && (
          <p className="py-16 text-sm text-gray-500 dark:text-gray-400">
            {t('allModels.loading')}
          </p>
        )}

        {!loading && error && (
          <p className="py-16 text-base text-gray-700 dark:text-gray-300">
            {t('allModels.error')}
          </p>
        )}

        {!loading && !error && vehicle && (
          <>
            <p className="max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
              {t('vehicleDetail.comingSoon')}
            </p>
            <Link
              to="/all-models"
              className="mt-8 rounded-md border border-gray-900 px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 dark:border-gray-200 dark:text-white dark:hover:bg-gray-800"
            >
              {t('vehicleDetail.backToModels')}
            </Link>
          </>
        )}
      </main>

      <Footer noTopBorder />
      <ScrollToTopButton />
    </div>
  )
}

export default VehicleDetail