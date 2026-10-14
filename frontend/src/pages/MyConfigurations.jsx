import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ScrollToTopButton from '../components/layout/ScrollToTopButton'
import ConfirmModal from '../components/shared/ConfirmModal'
import api from '../services/api'

function MyConfigurations() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const locale = i18n.resolvedLanguage === 'fr' ? 'fr-FR' : 'en-GB'
  const [configurations, setConfigurations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)

  useEffect(() => {
    api
      .get('/saved-configurations')
      .then(({ data }) => setConfigurations(data.configurations || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(locale) : ''

  const handleOpen = (config) => {
    navigate(`/configure/${config.vehicleId}`, {
      state: { restoreOptions: config.configurationData },
    })
  }

  const handleDelete = async () => {
    const target = pendingDelete
    setPendingDelete(null)
    if (!target) return
    try {
      await api.delete(`/saved-configurations/${target.id}`)
      setConfigurations((prev) => prev.filter((c) => c.id !== target.id))
    } catch {
      setError(true)
    }
  }

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
            {t('myConfigurations.title')}
          </h1>
        </div>
      </header>

      <main className="mx-auto w-[min(88vw,1500px)] px-4 pb-24 pt-10 md:px-8">
        {loading && (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('myConfigurations.loading')}
          </p>
        )}

        {!loading && error && (
          <p className="py-16 text-center text-sm text-gray-600 dark:text-gray-300">
            {t('myConfigurations.error')}
          </p>
        )}

        {!loading && !error && configurations.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('myConfigurations.empty')}
            </p>
            <Link
              to="/all-models"
              className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {t('common.discoverNow')}
            </Link>
          </div>
        )}

        {!loading && !error && configurations.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {configurations.map((config) => (
              <article
                key={config.id}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <img
                  src={config.image}
                  alt={config.modelName}
                  className="h-44 w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/images/placeholder-vehicle.svg'
                  }}
                />
                <div className="p-5">
                  <h2 className="font-manrope text-lg font-semibold text-gray-900 dark:text-white">
                    {config.modelName}
                  </h2>
                  {config.variantLabel && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {config.variantLabel}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {t('myConfigurations.savedOn')} : {formatDate(config.createdAt)}
                  </p>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpen(config)}
                      className="rounded-md bg-bmw-blue px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#00559a]"
                    >
                      {t('myConfigurations.open')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(config)}
                      aria-label={t('myConfigurations.delete')}
                      className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-zinc-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <Trash2 size={15} />
                      {t('myConfigurations.delete')}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <Footer noTopBorder />
      <ScrollToTopButton />

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title={t('myConfigurations.deleteConfirmTitle')}
        message={t('myConfigurations.deleteConfirmMessage')}
        confirmLabel={t('myConfigurations.delete')}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

export default MyConfigurations
