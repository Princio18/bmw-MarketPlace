import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, RotateCw } from 'lucide-react'
import { TABS_HEIGHT, NAVBAR_HEIGHT } from './layout'

function StepTabs({
  tabs,
  activeTab,
  activeIndex,
  onSelect,
  onOpen360,
  has3dExterior = true,
}) {
  const { t } = useTranslation()
  const trackRef = useRef(null)
  const tabRefs = useRef({})

  const scrollTrackRight = () => {
    const track = trackRef.current
    if (!track) return
    // Rien à faire si la barre est déjà scrollée jusqu'à la fin.
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 1) return
    track.scrollBy({ left: track.clientWidth, behavior: 'smooth' })
  }

  // Sur mobile la barre déborde : l'onglet actif est brought into view pour
  // qu'il reste visible sans manipulation manuelle. `block: 'nearest'` évite
  // de faire remonter la page, le scroll vertical étant géré par la page.
  useEffect(() => {
    tabRefs.current[activeTab]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [activeTab])

  return (
    <div
      className="sticky z-30 border-b border-gray-200 bg-white"
      style={{ top: NAVBAR_HEIGHT, height: TABS_HEIGHT }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1800px] items-center gap-4 px-6">
        <div className="flex flex-shrink-0 items-center gap-3">
          <button
            type="button"
            // Le bouton reste TOUJOURS actif : sans modèle, le viewer affiche
            // l'écran « non disponible » existant. L'info-bulle annonce
            // simplement l'absence de modèle au lieu de laisser deviner l'erreur.
            title={has3dExterior
              ? t('configure.steps.view360')
              : t('configure.view360.comingSoon')}
            aria-label={t('configure.steps.view360')}
            onClick={onOpen360}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
          >
            <RotateCw size={14} />
          </button>

          <span className="shrink-0 text-xs font-semibold tabular-nums text-gray-500">
            {t('configure.steps.counter', {
              current: activeIndex + 1,
              total: tabs.length,
            })}
          </span>
        </div>

        <div
          ref={trackRef}
          className="flex flex-1 items-center overflow-x-auto"
        >
          <div className="mx-auto flex items-center gap-6 whitespace-nowrap">
            {tabs.map((tab) => {
              const isActive = tab === activeTab
              return (
                <button
                  key={tab}
                  type="button"
                  ref={(el) => {
                    tabRefs.current[tab] = el
                  }}
                  onClick={() => onSelect(tab)}
                  aria-current={isActive ? 'true' : undefined}
                  className={
                    isActive
                      ? 'border-b-2 border-blue-600 pb-0.5 text-sm font-bold text-gray-900'
                      : 'border-b-2 border-transparent pb-0.5 text-sm text-gray-500 transition hover:text-gray-800'
                  }
                >
                  {t(`configure.tabs.${tab}`)}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-shrink-0">
          <button
            type="button"
            title={t('configure.steps.scrollTabs')}
            aria-label={t('configure.steps.scrollTabs')}
            onClick={scrollTrackRight}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default StepTabs
