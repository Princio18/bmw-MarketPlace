import { useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import bmwImage from '../../assets/images/BMW.png'

function Hero() {
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const { t } = useTranslation()

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) {
      video.pause()
      setIsPlaying(false)
    } else {
      video.play()
      setIsPlaying(true)
    }
  }

  const [titleBefore, titleAfter] = t('hero.title').split('iX5')

  return (
    <>
      <section
        className="relative h-screen w-full overflow-hidden"
        onClick={togglePlay}
      >
      <video
        ref={videoRef}
        className="absolute inset-0 z-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        aria-hidden="true"
      >
        <source src="/videos/hero-bmw-ix5.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 z-[1] bg-black/25" />

      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      <div className="absolute bottom-16 left-6 z-20 max-w-lg text-white md:left-20">
        <h1 className="font-montserrat whitespace-nowrap text-[28px] font-bold uppercase tracking-tight md:text-[52px]">
          {titleBefore}
          <span className="normal-case">iX5</span>
          {titleAfter}
        </h1>
        <p className="font-manrope mt-2 text-sm font-extralight uppercase tracking-wide md:text-base">
          {t('hero.subtitle')}
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            {t('hero.keepInformed')}
          </button>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="border border-white px-6 py-3 font-semibold text-white transition hover:bg-white hover:text-black"
          >
            {t('hero.discover')}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          togglePlay()
        }}
        aria-label={
          isPlaying ? t('hero.pauseVideo') : t('hero.resumeVideo')
        }
        className="absolute bottom-8 right-8 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/70 bg-black/30 backdrop-blur-sm transition hover:bg-black/50"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>
      </section>

      <section className="px-[25px] pb-[45px] pt-[25px]">
        <p className="font-manrope text-center text-[26px] font-extralight text-gray-900 md:text-[28px] dark:text-white">
          {t('hero.findYour420i')}
        </p>
        <img
          src={bmwImage}
          alt={t('hero.findYour420iAlt')}
          className="mx-auto h-auto w-full max-w-[999px]"
        />
      </section>
      
    </>
  )
}

export default Hero