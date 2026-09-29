import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import api from '../services/api'
import ConfiguratorImage from '../components/configure/ConfiguratorImage'
import ConfiguratorNavbar from '../components/configure/ConfiguratorNavbar'
import FinanceModal from '../components/configure/modals/FinanceModal'
import OptionSection from '../components/configure/OptionSection'
import PriceOverviewModal from '../components/configure/modals/PriceOverviewModal'
import SaveConfigurationModal from '../components/configure/modals/SaveConfigurationModal'
import StandardEquipmentModal from '../components/configure/modals/StandardEquipmentModal'
import StepTabs from '../components/configure/StepTabs'
import TechnicalDataModal from '../components/configure/modals/TechnicalDataModal'
import {
  BOTTOM_BAR_HEIGHT,
  NAVBAR_HEIGHT,
  SCROLL_OFFSET,
} from '../components/configure/layout'

const TABS = [
  'models',
  'engines',
  'exteriorColours',
  'alloyWheels',
  'upholstery',
  'interiorTrims',
  'packages',
  'optionalEquipment',
  'charging',
  'summary',
]

function Configure() {
  const { vehicleId } = useParams()
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage === 'fr' ? 'fr-FR' : 'en-GB'
  const notAvailable = t('configure.navbar.notAvailable')

  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [failed, setFailed] = useState(false)
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [selectedByTab, setSelectedByTab] = useState({})
  const [openModal, setOpenModal] = useState(null)
  // La sélection financière vit ici (et non dans la modale) pour rester la
  // source de vérité unique du montant mensuel : navbar et modale Finance
  // affichent toujours le même produit.
  const [selectedFinanceId, setSelectedFinanceId] = useState(null)
  const ratiosRef = useRef(new Map())

  useEffect(() => {
    let cancelled = false

    api
      .get(`/vehicles/${vehicleId}`)
      .then(({ data }) => {
        if (cancelled) return
        setVehicle(data)
      })
      .catch((err) => {
        if (cancelled) return
        if (err.response?.status === 404) setNotFound(true)
        else setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [vehicleId])

  const specs = vehicle?.specs ?? null
  const models = useMemo(
    () => (Array.isArray(specs?.models) ? specs.models : []),
    [specs],
  )
  const financeOptions = useMemo(
    () => (Array.isArray(specs?.financeOptions) ? specs.financeOptions : []),
    [specs],
  )

  // Sélection par défaut : premier modèle disponible, source du prix affiché.
  // Dérivé plutôt que stocké, pour éviter un effet de synchronisation.
  const defaultModelId = models[0]?.id ?? null
  const selectedModelId = selectedByTab.models ?? defaultModelId

  const selectedModel =
    models.find((model) => model.id === selectedModelId) || models[0] || null
  const totalPrice =
    (selectedModel && selectedModel.priceFrom != null
      ? selectedModel.priceFrom
      : vehicle?.basePrice) ?? null

  const activeFinance =
    financeOptions.find((option) => option.id === selectedFinanceId) ||
    financeOptions[0] ||
    null
  const monthlyPrice = activeFinance?.monthly ?? null

  const selectedOptionIds = useMemo(() => {
    const id = selectedByTab.optionalEquipment
    return id == null ? [] : [id]
  }, [selectedByTab.optionalEquipment])

  // Un seul observer pilote l'onglet actif : on retient le ratio réel de
  // chaque section (et non le simple franchissement du seuil) pour élire la
  // section la plus visible, puis on déconnecte au démontage.
  useEffect(() => {
    if (!vehicle) return undefined
    const sections = TABS.map((tab) =>
      document.getElementById(`section-${tab}`),
    ).filter(Boolean)
    if (sections.length === 0) return undefined

    const ratios = ratiosRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        })
        let bestId = null
        let bestRatio = 0
        ratios.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestId = id
          }
        })
        if (!bestId) return
        const tab = bestId.replace('section-', '')
        if (TABS.includes(tab)) setActiveTab(tab)
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [vehicle])

  const handleSelect = useCallback((tab, id) => {
    setSelectedByTab((prev) => ({ ...prev, [tab]: id }))
  }, [])

  const handleTabSelect = useCallback((tab) => {
    setActiveTab(tab)
    document
      .getElementById(`section-${tab}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleReset = useCallback(() => {
    setActiveTab(TABS[0])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Un seul gestionnaire de fermeture partagé : chaque modale reste isolée,
  // fermer l'une n'affecte l'état d'aucune autre.
  const closeModal = useCallback(() => setOpenModal(null), [])

  const activeIndex = Math.max(TABS.indexOf(activeTab), 0)
  const consumption = specs?.technicalData?.consumption

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500"
        style={{ paddingTop: NAVBAR_HEIGHT }}
      >
        {t('configure.loading')}
      </div>
    )
  }

  if (notFound) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center"
        style={{ paddingTop: NAVBAR_HEIGHT }}
      >
        <h1 className="text-2xl font-bold text-gray-900">
          {t('configure.notFound')}
        </h1>
        <p className="text-sm text-gray-500">{t('configure.notFoundHint')}</p>
        <Link
          to="/all-models"
          className="rounded-sm bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {t('configure.backToAllModels')}
        </Link>
      </div>
    )
  }

  if (failed || !vehicle) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-sm text-gray-500"
        style={{ paddingTop: NAVBAR_HEIGHT }}
      >
        {t('configure.error')}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <ConfiguratorNavbar
        vehicle={vehicle}
        keySpecs={specs?.keySpecs}
        totalPrice={totalPrice}
        monthlyPrice={monthlyPrice}
        locale={locale}
        onOpenModal={setOpenModal}
        onReset={handleReset}
      />

      <div
        style={{
          paddingTop: NAVBAR_HEIGHT,
          paddingBottom: BOTTOM_BAR_HEIGHT + 48,
        }}
      >
        <StepTabs
          tabs={TABS}
          activeTab={activeTab}
          activeIndex={activeIndex}
          onSelect={handleTabSelect}
        />

        <div className="mx-auto grid w-full max-w-[1800px] gap-8 px-6 md:grid-cols-2">
          <div
            className="sticky h-[70vh] self-start"
            style={{ top: SCROLL_OFFSET }}
          >
            <ConfiguratorImage vehicle={vehicle} />
          </div>

          <div>
            {TABS.map((tab) => (
              <section
                key={tab}
                id={`section-${tab}`}
                className="min-h-screen"
                style={{ scrollMarginTop: SCROLL_OFFSET }}
              >
                <OptionSection
                  tabKey={tab}
                  label={t(`configure.tabs.${tab}`)}
                  specs={specs}
                  selectedId={
                    selectedByTab[tab] ?? (tab === 'models' ? defaultModelId : undefined)
                  }
                  onSelect={(id) => handleSelect(tab, id)}
                  locale={locale}
                />
              </section>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 z-30 flex w-full items-center justify-between gap-4 border-t border-gray-200 bg-white px-6 py-3">
        <span className="truncate text-xs text-gray-500">
          {t('configure.bottomBar.consumption', {
            consumption: consumption?.wltpEnergyConsumption || notAvailable,
            co2: consumption?.wltpCO2 || notAvailable,
          })}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-sm text-gray-600">
          {t('configure.bottomBar.scrollToContinue')}
          <ChevronDown className="h-4 w-4" />
        </span>
        <button
          type="button"
          onClick={() => setOpenModal('saveConfiguration')}
          className="shrink-0 rounded-sm bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {t('configure.navbar.saveConfiguration')}
        </button>
      </div>

      <TechnicalDataModal
        open={openModal === 'technicalData'}
        specs={specs}
        onClose={closeModal}
      />
      <StandardEquipmentModal
        open={openModal === 'standardEquipment'}
        vehicle={vehicle}
        onClose={closeModal}
      />
      <FinanceModal
        open={openModal === 'finance'}
        vehicle={vehicle}
        locale={locale}
        selectedFinanceId={selectedFinanceId}
        onSelectFinance={setSelectedFinanceId}
        onClose={closeModal}
      />
      <PriceOverviewModal
        open={openModal === 'priceOverview'}
        specs={specs}
        basePrice={totalPrice ?? 0}
        selectedOptionIds={selectedOptionIds}
        locale={locale}
        onClose={closeModal}
      />
      <SaveConfigurationModal
        open={openModal === 'saveConfiguration'}
        vehicle={vehicle}
        onClose={closeModal}
      />
    </div>
  )
}

export default Configure
