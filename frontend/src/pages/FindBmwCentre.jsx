import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ScrollToTopButton from '../components/layout/ScrollToTopButton'
import BmwMap from '../components/map/BmwMap'
import MapSearchBar from '../components/map/MapSearchBar'
import bmwCentres from '../data/bmwCentres'
import { geocode } from '../services/geocode'

const DEFAULT_CENTER = { latitude: 48.8566, longitude: 2.3522 }

function FindBmwCentre() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [center, setCenter] = useState(DEFAULT_CENTER)
  const [searching, setSearching] = useState(false)
  const [notice, setNotice] = useState('')

  const handleSearch = async (query) => {
    setSearching(true)
    setNotice('')
    try {
      const result = await geocode(query)
      if (result) {
        setCenter({
          latitude: result.latitude,
          longitude: result.longitude,
        })
      } else {
        setNotice(t('pages.findCentre.noticeNotFound'))
      }
    } catch {
      setNotice(t('pages.findCentre.noticeUnavailable'))
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-background dark:bg-gray-950">
      <div className="relative h-[72px]">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 z-10 h-[120px] bg-gradient-to-b from-black/40 via-black/15 to-transparent"
        />
        <Navbar />
      </div>

      <main className="mx-auto w-[min(88vw,1500px)] px-4 pb-24 pt-12 md:px-8 md:pt-16">
        <h1 className="font-manrope text-4xl font-extralight uppercase tracking-tight text-gray-900 md:text-5xl md:leading-tight dark:text-white">
          {t('pages.findCentre.title')}
        </h1>

        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
          {t('pages.findCentre.f1')}{' '}
          <Link
            to="/login"
            className="font-bold text-gray-900 underline hover:text-bmw-blue dark:text-white"
          >
            {t('pages.findCentre.hereLink')}
          </Link>{' '}
          {t('pages.findCentre.f2')}{' '}
          {t('pages.findCentre.f3')}{' '}
          {t('pages.findCentre.f4')} {t('pages.findCentre.f5')}
        </p>

        <div className="relative mt-10 h-[520px] w-full md:h-[600px]">
          <MapSearchBar onSearch={handleSearch} loading={searching} />
          {notice && (
            <p className="absolute left-1/2 top-16 z-[1000] -translate-x-1/2 rounded-md bg-white/90 px-3 py-1.5 text-xs text-gray-600 shadow dark:bg-gray-900/90 dark:text-gray-300">
              {notice}
            </p>
          )}
          <BmwMap
            centres={bmwCentres}
            center={center}
            onBookService={() => navigate('/login')}
          />
        </div>
      </main>

      <Footer noTopBorder />
      <ScrollToTopButton />
    </div>
  )
}

export default FindBmwCentre