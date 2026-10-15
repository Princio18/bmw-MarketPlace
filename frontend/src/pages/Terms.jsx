import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import api from '../services/api'

// Page informative : texte de démonstration, pas un document juridique.
// La version des conditions est exposée par GET /api/meta (source de vérité
// côté serveur, enregistrée sur chaque commande au paiement).
const DEFAULT_TERMS_VERSION = '2026-10'

const SECTIONS = [
  'order',
  'price',
  'payment',
  'cancellation',
  'handover',
  'data',
]

function Terms() {
  const { t } = useTranslation()
  const [termsVersion, setTermsVersion] = useState(DEFAULT_TERMS_VERSION)

  useEffect(() => {
    let active = true
    api
      .get('/meta')
      .then(({ data }) => {
        if (active && data?.termsVersion) {
          setTermsVersion(data.termsVersion)
        }
      })
      .catch(() => {
        /* version par défaut conservée */
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-gray-700 transition hover:text-bmw-blue dark:text-gray-300"
      >
        <ArrowLeft size={16} />
        {t('common.backHome')}
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        {t('terms.title')}
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {t('terms.versionLabel')} {termsVersion}
      </p>

      <p className="mt-6 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {t('terms.disclaimer')}
      </p>

      <div className="mt-8 space-y-6">
        {SECTIONS.map((key) => (
          <section key={key}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t(`terms.sections.${key}.title`)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {t(`terms.sections.${key}.body`)}
            </p>
          </section>
        ))}
      </div>
    </div>
  )
}

export default Terms
