import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useThreeScene } from '../../hooks/useThreeScene'
import LoadingSpinner3D from './LoadingSpinner3D'

const MINIMUM_PHASE_MS = 5000

/**
 * Overlay plein écran de la vue 360°.
 *
 * Le conteneur du canvas est monté dès le début (et non seulement à la fin du
 * chargement) : le renderer a besoin d'un nœud DOM dimensionné pour calculer
 * l'aspect ratio, et cela permet en prime de charger le GLTF en parallèle du
 * délai minimal d'affichage. Le spinner est simplement superposé par-dessus.
 */
function ThreeSixtyViewer({ vehicle, bodyColor = null, onClose }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState('out')
  const [phase, setPhase] = useState('loading')

  const { containerRef, exteriorFailed, interiorAvailable } = useThreeScene({
    mode,
    bodyColor,
    active: true,
  })

  // L'échec du modèle est une information externe (le chargement GLTF) : on
  // le dérive plutôt que de le recopier dans un état, et il prend le pas sur
  // le délai d'affichage.
  const isError = exteriorFailed
  const isReady = phase === 'ready' && !isError

  // Le délai minimal garantit un écran d'accueil visible même quand tout est
  // déjà en cache ; le modèle, lui, est chargé en parallèle.
  useEffect(() => {
    if (isError) return undefined
    const timer = setTimeout(() => setPhase('ready'), MINIMUM_PHASE_MS)
    return () => clearTimeout(timer)
  }, [isError])

  const handleClose = useCallback(() => {
    onClose?.()
  }, [onClose])

  // Fermeture au clavier et blocage du défilement de la page en dessous.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [handleClose])

  const name = vehicle?.name

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={t('configure.steps.view360')}
    >
      <div
        ref={containerRef}
        className={`absolute inset-0 transition-opacity duration-500 ${
          isReady ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {!isReady && (
        <div className="absolute inset-0 bg-[#0b0b0f]">
          {isError ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-sm text-white/80">
                {t('configure.view360.exteriorUnavailable')}
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-sm border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
              >
                {t('configure.view360.closeViewer')}
              </button>
            </div>
          ) : (
            <LoadingSpinner3D />
          )}
        </div>
      )}

      {isReady && (
        <>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t('configure.view360.close')}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/40 text-xl leading-none text-white transition hover:bg-white/15"
          >
            &#10005;
          </button>

          {name && (
            <p className="pointer-events-none absolute left-5 top-6 text-sm font-semibold uppercase tracking-widest text-white/70">
              {name}
            </p>
          )}

          {mode === 'in' && !interiorAvailable ? (
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <p className="text-center text-sm text-white/70">
                {t('configure.view360.interiorUnavailable')}
              </p>
            </div>
          ) : (
            <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
              <div className="flex items-center gap-1 rounded-full border border-white/20 bg-black/40 p-1 backdrop-blur">
                <button
                  type="button"
                  onClick={() => setMode('out')}
                  className={`rounded-full px-6 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                    mode === 'out'
                      ? 'bg-white text-black'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {t('configure.view360.viewOut')}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('in')}
                  className={`rounded-full px-6 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                    mode === 'in'
                      ? 'bg-white text-black'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {t('configure.view360.viewIn')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ThreeSixtyViewer
