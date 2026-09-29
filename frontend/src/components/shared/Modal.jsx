import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

// Coquille de modale générique : overlay semi-transparent, panneau centré
// scrollable, fermeture par X, clic sur l'overlay ou touche Échap.
function Modal({ open, title, onClose, children }) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-200 bg-white p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          title={t('configure.modal.close')}
          aria-label={t('configure.modal.close')}
          className="absolute right-4 top-4 rounded-sm p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <X size={18} />
        </button>
        {title && (
          <h2 className="pr-8 text-lg font-semibold text-gray-900">{title}</h2>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

export default Modal
