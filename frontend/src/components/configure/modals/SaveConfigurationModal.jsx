import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight } from 'lucide-react'
import Modal from '../../shared/Modal'
import api from '../../../services/api'
import { useAuth } from '../../../context/useAuth'
import { getErrorMessage } from '../../../utils/getErrorMessage'

// Corps de la modale : monté uniquement quand la modale est ouverte (Modal
// renvoie null sinon), ce qui réinitialise `submitting` / `error` à chaque
// ouverture sans effet de synchronisation.
function SaveConfigurationBody({ vehicle, selectedOptions, onClose, onSaved }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const modelName = vehicle?.modelName ?? ''
  const variantLabel = vehicle?.variantLabel ?? ''
  const title = [modelName, variantLabel].filter(Boolean).join(' ')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Visiteur non connecté : on met la configuration de côté puis on file vers
  // le login. Après connexion, Login renvoie sur le configurateur qui restaure
  // la sélection depuis sessionStorage.
  const redirectToLogin = () => {
    if (vehicle?.id) {
      sessionStorage.setItem(
        `pendingConfig:${vehicle.id}`,
        JSON.stringify(selectedOptions),
      )
      onClose()
      navigate(`/login?redirect=${encodeURIComponent(`/configure/${vehicle.id}`)}`)
    } else {
      onClose()
    }
  }

  const handleSaveOnly = async () => {
    if (!isAuthenticated) {
      redirectToLogin()
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api.post('/saved-configurations', {
        vehicleId: vehicle?.id,
        configurationData: selectedOptions,
      })
      onClose()
      onSaved?.(t('configure.saveConfiguration.savedToast'))
    } catch (err) {
      setError(
        getErrorMessage(err, t('configure.saveConfiguration.errors.generic')),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveAndConfirm = async () => {
    if (!isAuthenticated) {
      redirectToLogin()
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const { data } = await api.post('/configuration-requests', {
        vehicleId: vehicle?.id,
        configurationData: selectedOptions,
      })
      onClose()
      navigate(`/configure/${vehicle?.id}/confirm-request`, {
        state: { requestId: data.id },
      })
    } catch (err) {
      setError(
        getErrorMessage(err, t('configure.saveConfiguration.errors.generic')),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-base font-bold uppercase tracking-wide text-gray-900">
            {t('configure.saveConfiguration.title')}
          </h3>
          <p className="mt-2 text-sm text-gray-700">
            {t('configure.saveConfiguration.subtitle', {
              model: title,
            })}
          </p>
          <div className="mt-4 flex gap-2">
            <Check size={16} className="mt-0.5 shrink-0 text-gray-700" />
            <p className="text-sm text-gray-700">
              {t('configure.saveConfiguration.checklist')}
            </p>
          </div>
        </div>

        <img
          src={`/api/vehicles/${vehicle?.id}/image`}
          alt={`BMW ${modelName}`.trim()}
          className="h-48 w-full rounded object-cover"
        />
      </div>

      <p className="mt-6 text-xs text-gray-500">
        {t('configure.saveConfiguration.legal')}{' '}
        <a href="#" className="underline">
          {t('configure.saveConfiguration.privacyPolicy')}
        </a>{' '}
        {t('configure.saveConfiguration.and')}{' '}
        <a href="#" className="underline">
          {t('configure.saveConfiguration.centrePolicy')}
        </a>
        .
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex items-center justify-end gap-6">
        <button
          type="button"
          onClick={handleSaveOnly}
          disabled={submitting}
          className="flex items-center gap-1 text-sm font-semibold text-gray-900 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t('configure.saveConfiguration.saveOnly')}
          <ChevronRight size={14} />
        </button>
        <button
          type="button"
          onClick={handleSaveAndConfirm}
          disabled={submitting}
          className="rounded-sm bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t('configure.saveConfiguration.saveAndConfirm')}
        </button>
      </div>
    </>
  )
}

function SaveConfigurationModal({ open, vehicle, onClose, selectedOptions, onSaved }) {
  const { t } = useTranslation()

  return (
    <Modal
      open={open}
      title={t('configure.saveConfiguration.title')}
      onClose={onClose}
    >
      <SaveConfigurationBody
        vehicle={vehicle}
        selectedOptions={selectedOptions}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  )
}

export default SaveConfigurationModal
