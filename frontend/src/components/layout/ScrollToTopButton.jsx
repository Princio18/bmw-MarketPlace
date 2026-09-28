import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const NAVBAR_HEIGHT = 72

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > NAVBAR_HEIGHT)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      type="button"
      aria-label={t('aria.backToTop')}
      onClick={scrollToTop}
      className={`fixed bottom-8 right-8 z-50 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition-colors duration-300 hover:bg-bmw-blue ${
        visible
          ? 'opacity-100'
          : 'pointer-events-none opacity-0'
      }`}
    >
      <ArrowUp size={18} />
    </button>
  )
}

export default ScrollToTopButton