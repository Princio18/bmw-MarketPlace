import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Maximize2, X } from 'lucide-react'

const FALLBACK_IMAGE = '/images/placeholder-vehicle.svg'

function ConfiguratorImage({ vehicle }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const src = vehicle.image || `/api/vehicles/${vehicle.id}/image`

  return (
    <div className="relative h-full w-full overflow-hidden rounded-sm bg-gray-50">
      <img
        src={src}
        alt={`BMW ${vehicle.modelName}`}
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = FALLBACK_IMAGE
        }}
        className="h-full w-full object-contain"
      />

      <button
        type="button"
        title={t('configure.image.expand')}
        aria-label={t('configure.image.expand')}
        onClick={() => setExpanded(true)}
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-sm transition hover:bg-white"
      >
        <Maximize2 size={16} />
      </button>

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('configure.image.expand')}
          onClick={() => setExpanded(false)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-white/95 p-8"
        >
          <img
            src={src}
            alt={`BMW ${vehicle.modelName}`}
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = FALLBACK_IMAGE
            }}
            className="max-h-full max-w-full object-contain"
          />
          <button
            type="button"
            onClick={() => setExpanded(false)}
            title={t('configure.modal.close')}
            aria-label={t('configure.modal.close')}
            className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm transition hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  )
}

export default ConfiguratorImage
