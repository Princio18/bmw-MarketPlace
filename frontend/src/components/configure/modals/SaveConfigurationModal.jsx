import { useTranslation } from 'react-i18next'
import { Check, ChevronRight } from 'lucide-react'
import Modal from '../../shared/Modal'

function SaveConfigurationModal({ open, vehicle, onClose }) {
  const { t } = useTranslation()
  const modelName = vehicle?.modelName ?? ''
  const variantLabel = vehicle?.variantLabel ?? ''
  const title = [modelName, variantLabel].filter(Boolean).join(' ')

  return (
    <Modal
      open={open}
      title={t('configure.saveConfiguration.title')}
      onClose={onClose}
    >
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

      <div className="mt-6 flex items-center justify-end gap-6">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 text-sm font-semibold text-gray-900 transition hover:text-blue-700"
        >
          {t('configure.saveConfiguration.saveOnly')}
          <ChevronRight size={14} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {t('configure.saveConfiguration.saveAndConfirm')}
        </button>
      </div>
    </Modal>
  )
}

export default SaveConfigurationModal
