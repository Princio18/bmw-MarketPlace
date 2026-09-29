import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, RotateCw } from 'lucide-react'
import { TABS_HEIGHT, NAVBAR_HEIGHT } from './layout'

function StepTabs({ tabs, activeTab, activeIndex, onSelect }) {
  const { t } = useTranslation()
  const trackRef = useRef(null)

  const scrollTrackRight = () => {
    const track = trackRef.current
    if (!track) return
    // Rien à faire si la barre est déjà scrollée jusqu'à la fin.
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 1) return
    track.scrollBy({ left: track.clientWidth, behavior: 'smooth' })
  }

  return (
    <div
      className="sticky z-30 border-b border-gray-200 bg-white"
      style={{ top: NAVBAR_HEIGHT, height: TABS_HEIGHT }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1800px] items-center gap-4 px-6">
        <button
          type="button"
          title={t('configure.steps.view360')}
          aria-label={t('configure.steps.view360')}
          onClick={() => console.log('360 view — coming soon')}
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

        <div
          ref={trackRef}
          className="flex flex-1 items-center gap-6 overflow-x-auto whitespace-nowrap"
        >
          {tabs.map((tab) => {
            const isActive = tab === activeTab
            return (
              <button
                key={tab}
                type="button"
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
  )
}

export default StepTabs
