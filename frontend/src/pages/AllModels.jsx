import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ScrollToTopButton from '../components/layout/ScrollToTopButton'
import FilterSidebar from '../components/all-models/FilterSidebar'
import SortDropdown from '../components/all-models/SortDropdown'
import VehicleGrid from '../components/all-models/VehicleGrid'
import { useAuth } from '../context/useAuth'
import { fetchVehicleCatalog } from '../lib/vehicles'

const DEFAULT_FILTERS = {
  categories: [],
  series: [],
  drivetrains: [],
  mPerformance: false,
  priceMin: '',
  priceMax: '',
}

const SORT_ORDER = {
  new_arrival: (a, b) => Number(b.isNew) - Number(a.isNew),
  price_low_to_high: (a, b) => (a.basePrice ?? Infinity) - (b.basePrice ?? Infinity),
  price_high_to_low: (a, b) => (b.basePrice ?? -Infinity) - (a.basePrice ?? -Infinity),
}

const GROUP_ORDER = ['electric', 'hybrid', 'petrol', 'diesel', 'concept', 'protection']

function AllModels() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [priceRange, setPriceRange] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sort, setSort] = useState('new_arrival')
  const [expandedId, setExpandedId] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const loadVehicles = async () => {
    try {
      const [vehiclesRes, rangeRes] = await fetchVehicleCatalog()
      setVehicles(vehiclesRes.data)
      setPriceRange(rangeRes.data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVehicleCatalog()
      .then(([vehiclesRes, rangeRes]) => {
        setVehicles(vehiclesRes.data)
        setPriceRange(rangeRes.data)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const visibleVehicles = useMemo(() => {
    const list = vehicles.filter((vehicle) => {
      if (
        filters.categories.length > 0 &&
        !filters.categories.includes(vehicle.category)
      ) {
        return false
      }
      if (filters.series.length > 0 && !filters.series.includes(vehicle.series)) {
        return false
      }
      if (
        filters.drivetrains.length > 0 &&
        !filters.drivetrains.includes(vehicle.drivetrain)
      ) {
        return false
      }
      if (filters.mPerformance && !vehicle.isMPerformance) {
        return false
      }
      if (filters.priceMin !== '') {
        const min = Number(filters.priceMin)
        if (vehicle.basePrice != null && vehicle.basePrice < min) {
          return false
        }
      }
      if (filters.priceMax !== '') {
        const max = Number(filters.priceMax)
        if (vehicle.basePrice != null && vehicle.basePrice > max) {
          return false
        }
      }
      return true
    })
    const comparer = SORT_ORDER[sort] || SORT_ORDER.new_arrival
    return [...list].sort(comparer)
  }, [vehicles, filters, sort])

  const groups = useMemo(() => {
    const totalCounts = {}
    for (const vehicle of vehicles) {
      totalCounts[vehicle.drivetrain] = (totalCounts[vehicle.drivetrain] || 0) + 1
    }
    const byDrivetrain = {}
    for (const vehicle of visibleVehicles) {
      byDrivetrain[vehicle.drivetrain] = byDrivetrain[vehicle.drivetrain] || []
      byDrivetrain[vehicle.drivetrain].push(vehicle)
    }
    return GROUP_ORDER.filter((drivetrain) => (byDrivetrain[drivetrain] || []).length > 0)
      .map((drivetrain) => ({
        drivetrain,
        vehicles: byDrivetrain[drivetrain],
        total: totalCounts[drivetrain] || 0,
      }))
  }, [vehicles, visibleVehicles])

  const sidebar = (
    <FilterSidebar
      vehicles={vehicles}
      filters={filters}
      onChange={setFilters}
      priceBounds={priceRange}
    />
  )

  return (
    <div className="min-h-screen bg-background dark:bg-gray-950">
      <header className="relative overflow-hidden bg-bmw-dark">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,102,177,0.35),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(0,102,177,0.2),transparent_60%)]"
        />
        <Navbar />
        <div className="relative mx-auto w-[min(88vw,1500px)] px-4 pb-14 pt-32 md:px-8">
          <h1 className="font-manrope text-4xl font-extralight tracking-tight text-white md:text-5xl md:leading-tight">
            {t('nav.models')}
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/70">
            {t('allModels.subtitle')}
          </p>
        </div>
      </header>

      <main className="mx-auto w-[min(88vw,1500px)] px-4 pb-24 pt-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-bmw-blue hover:text-bmw-blue lg:hidden dark:border-gray-600 dark:text-gray-200"
            >
              <SlidersHorizontal size={15} />
              {t('allModels.sidebar.filters')}
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('allModels.results', { count: visibleVehicles.length })}
            </p>
          </div>
          <SortDropdown value={sort} onChange={setSort} />
        </div>

        {filtersOpen && (
          <div className="mt-6 lg:hidden">
            {sidebar}
          </div>
        )}

        <div className="mt-6 grid gap-10 lg:grid-cols-[280px_1fr]">
          <div className="hidden lg:block">
            <div className="sticky top-6">{sidebar}</div>
          </div>

          <section>
            {loading && (
              <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('allModels.loading')}
              </p>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('allModels.error')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true)
                    setError(false)
                    loadVehicles()
                  }}
                  className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  {t('allModels.retry')}
                </button>
              </div>
            )}

            {!loading && !error && visibleVehicles.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('allModels.empty.title')}
                </p>
                <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
                  {t('allModels.empty.text')}
                </p>
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="mt-3 rounded-md border border-gray-900 px-5 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 dark:border-gray-200 dark:text-white dark:hover:bg-gray-800"
                >
                  {t('allModels.sidebar.reset')}
                </button>
              </div>
            )}

            {!loading && !error && visibleVehicles.length > 0 && (
              <div className="space-y-12">
                {groups.map((group) => (
                  <section key={group.drivetrain}>
                    <h2 className="font-manrope mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                      {t(`allModels.groups.${group.drivetrain}`, { count: group.total })}
                    </h2>
                    <VehicleGrid
                      vehicles={group.vehicles}
                      expandedId={expandedId}
                      onToggle={(id) => {
                        if (!isAuthenticated) {
                          navigate(`/vehicles/${id}`)
                          return
                        }
                        setExpandedId((current) => (current === id ? null : id))
                      }}
                    />
                  </section>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer noTopBorder />
      <ScrollToTopButton />
    </div>
  )
}

export default AllModels