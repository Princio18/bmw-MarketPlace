import { useTranslation } from 'react-i18next'

/**
 * Écran de chargement de la vue 360°. Pur CSS/SVG : aucune image n'est
 * requise, donc l'overlay s'affiche même avant que le moindre asset ne soit
 * présent dans public/models.
 */
function LoadingSpinner3D() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8">
      <div className="relative h-40 w-64">
        <svg
          viewBox="0 0 240 140"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="body-shine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.55" />
            </linearGradient>
          </defs>

          {/* Corps : une silhouette simple, profil 3/4 */}
          <path
            d="M22 96c0-9 4-15 12-19l26-13c7-4 12-10 18-16 6-6 14-9 23-9h20c11 0 21 4 28 12l14 15c5 5 11 8 19 10l9 2c7 2 11 8 11 15v6c0 4-3 7-7 7H29c-4 0-7-3-7-7z"
            fill="url(#body-shine)"
          />
          {/* Vitrage */}
          <path
            d="M78 62c6-6 12-9 20-9h16c8 0 15 3 20 9l10 11H68z"
            fill="#0b1c33"
            fillOpacity="0.55"
          />
          {/* Bas de caisse */}
          <path
            d="M28 100h182"
            stroke="#ffffff"
            strokeOpacity="0.5"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Roues : petit rebond, décalées pour suggerer la perspective */}
          <g className="animate-wheel-bounce-left">
            <circle cx="70" cy="104" r="17" fill="#0b1c33" />
            <circle cx="70" cy="104" r="8" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="2" />
          </g>
          <g className="animate-wheel-bounce-right">
            <circle cx="176" cy="104" r="17" fill="#0b1c33" />
            <circle cx="176" cy="104" r="8" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="2" />
          </g>
        </svg>

        {/* Anneau tournant autour de la voiture */}
        <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/15 border-t-white/80 animate-spin" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 border-b-white/40 animate-spin [animation-direction:reverse] [animation-duration:3s]" />
      </div>

      <p className="text-sm font-medium text-white/80">{t('configure.view360.preparing')}</p>
    </div>
  )
}

export default LoadingSpinner3D
