import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ScrollToTopButton from '../components/layout/ScrollToTopButton'
import ConfigurationRequestForm from '../components/configure/ConfigurationRequestForm'
import api from '../services/api'

// Page « Update details » d'une demande existante. Protégée : un utilisateur
// connecté. Sans requestId (accès direct / refresh), on renvoie vers la liste.
function ConfigurationRequestConfirmation() {
  const { vehicleId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const requestId = location.state?.requestId ?? null

  const [vehicle, setVehicle] = useState(null)
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!requestId) {
      navigate('/my-requests', { replace: true })
    }
  }, [requestId, navigate])

  useEffect(() => {
    if (!requestId) return undefined
    let alive = true

    Promise.all([
      api
        .get(`/configuration-requests/${requestId}`)
        .then(({ data }) => data?.request ?? null)
        .catch(() => null),
      api
        .get(`/vehicles/${vehicleId}`)
        .then(({ data }) => data)
        .catch(() => null),
    ])
      .then(([requestData, vehicleData]) => {
        if (!alive) return
        setRequest(requestData)
        setVehicle(vehicleData)
        if (!requestData) setFailed(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [requestId, vehicleId])

  const vehicleTitle = vehicle
    ? [vehicle.modelName, vehicle.variantLabel].filter(Boolean).join(' ')
    : ''

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="relative h-[72px]">
        <Navbar variant="light" />
      </div>

      <main className="mx-auto w-[min(88vw,960px)] pb-24 pt-12 md:pt-16">
        <h1 className="font-manrope text-4xl font-light text-gray-900">
          {t('confirmRequest.title')}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-700">
          {t('confirmRequest.intro')}
        </p>

        <div className="mt-6 min-h-6 text-sm font-semibold text-gray-900">
          {loading
            ? t('confirmRequest.loadingVehicle')
            : vehicleTitle || t('confirmRequest.vehicleMissing')}
        </div>

        <div className="mt-8">
          {loading ? (
            <p className="text-sm text-gray-500">{t('confirmRequest.loading')}</p>
          ) : failed || !request ? (
            <p className="text-sm text-red-600">{t('confirmRequest.errors.general')}</p>
          ) : (
            <ConfigurationRequestForm requestId={requestId} initialRequest={request} />
          )}
        </div>
      </main>

      <Footer />
      <ScrollToTopButton />
    </div>
  )
}

export default ConfigurationRequestConfirmation
