import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import api from '../services/api'
import { getAuthToken } from '../lib/authToken'
import AlloyWheelsSection from '../components/configure/sections/AlloyWheelsSection'
import ConfiguratorImage from '../components/configure/ConfiguratorImage'
import ConfiguratorNavbar from '../components/configure/ConfiguratorNavbar'
import EnginesSection from '../components/configure/sections/EnginesSection'
import ExteriorColourSection from '../components/configure/sections/ExteriorColourSection'
import FinanceModal from '../components/configure/modals/FinanceModal'
import AccessoriesSection from '../components/configure/sections/AccessoriesSection'
import LoadingSpinner3D from '../components/configure/LoadingSpinner3D'
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
  'optionalEquipment',
  'charging',
  'summary',
]

// Onglets servis par un composant dédié ; les autres restent génériques.
const DEDICATED_SECTIONS = {
  engines: EnginesSection,
  exteriorColours: ExteriorColourSection,
  alloyWheels: AlloyWheelsSection,
  optionalEquipment: AccessoriesSection,
}

// Chaque onglet mono-sélection maps vers UNE clé de selectedOptions : une
// seule source de vérité pour l'état ET pour l'autosave.
const TAB_OPTION_KEY = {
  models: 'modelId',
  engines: 'engineId',
  exteriorColours: 'exteriorColourId',
  alloyWheels: 'alloyWheelId',
}

const EMPTY_SELECTION = {
  modelId: null,
  engineId: null,
  exteriorColourId: null,
  alloyWheelId: null,
  accessoryIds: [],
}

// Le délai d'inactivité avant écriture du panier : laisse le temps de changer
// plusieurs options (couleur puis jante) sans un POST par clic.
const AUTOSAVE_DEBOUNCE_MS = 800

// three.js pèse près d'un demi-mégaoctet gzip : on ne l'embarque pas dans le
// chargement initial de la page produit, il n'est utile qu'au clic sur le
// bouton 360°.
const ThreeSixtyViewer = lazy(() =>
  import('../components/configure/ThreeSixtyViewer'),
)

function toList(value) {
  return Array.isArray(value) ? value : []
}

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
  const [selectedOptions, setSelectedOptions] = useState(EMPTY_SELECTION)
  const [accessories, setAccessories] = useState([])
  const [openModal, setOpenModal] = useState(null)
  const [show3D, setShow3D] = useState(false)
  // La sélection financière vit ici (et non dans la modale) pour rester la
  // source de vérité unique du montant mensuel : navbar et modale Finance
  // affichent toujours le même produit.
  const [selectedFinanceId, setSelectedFinanceId] = useState(null)
  const ratiosRef = useRef(new Map())
  // Évite d'écrire un panier « vide » au premier rendu : seul un changement
  // réel de configuration déclenche l'autosave.
  const hasInteractedRef = useRef(false)

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

  // Accessoires : catalogue en base, restreint au véhicule courant (table
  // vehicle_accessories). Un véhicule sans accessoire rattaché reçoit une liste
  // vide, l'onglet « Options » affiche alors son état vide.
  useEffect(() => {
    let cancelled = false
    api
      .get('/accessories', { params: { vehicleId } })
      .then(({ data }) => {
        if (!cancelled) setAccessories(toList(data?.accessories))
      })
      .catch(() => {
        if (!cancelled) setAccessories([])
      })
    return () => {
      cancelled = true
    }
  }, [vehicleId])

  // L'onglet « Charging » n'a de sens que pour un véhicule rechargeable :
  // fully electric ou plug-in hybrid. On le retire donc de la liste des onglets
  // pour tous les autres drivetrains (petrol, diesel, concept, protection).
  const tabs = useMemo(() => {
    const drivetrain = vehicle?.drivetrain
    const supportsCharging = drivetrain === 'electric' || drivetrain === 'hybrid'
    return supportsCharging ? TABS : TABS.filter((tab) => tab !== 'charging')
  }, [vehicle?.drivetrain])

  const specs = vehicle?.specs ?? null
  const models = useMemo(() => toList(specs?.models), [specs])
  const financeOptions = useMemo(() => toList(specs?.financeOptions), [specs])

  // Sélection par défaut : premier modèle disponible, source du prix affiché.
  // Dérivé plutôt que stocké, pour éviter un effet de synchronisation.
  const defaultModelId = models[0]?.id ?? null
  const selectedModelId = selectedOptions.modelId ?? defaultModelId
  const selectedModel =
    models.find((model) => model.id === selectedModelId) || models[0] || null

  const activeFinance =
    financeOptions.find((option) => option.id === selectedFinanceId) ||
    financeOptions[0] ||
    null
  const monthlyPrice = activeFinance?.monthly ?? null

  // Un accessoire en rupture ne peut pas être acheté : on l'exclut du total
  // affiché pour ne jamais annoncer un prix qu'un serveur refusera.
  const selectedAccessories = useMemo(() => {
    const ids = toList(selectedOptions.accessoryIds)
    return accessories.filter((item) => ids.includes(item.id) && item.inStock)
  }, [accessories, selectedOptions.accessoryIds])

  const accessoriesTotal = useMemo(
    () =>
      selectedAccessories.reduce(
        (sum, item) => sum + (Number(item.price) || 0),
        0,
      ),
    [selectedAccessories],
  )

  // Prix du véhicule seul (hors accessoires) : PriceOverviewModal s'occupe
  // lui-même d'ajouter les accessoires et la TVA, il ne faut donc PAS lui
  // passer un total déjà majoré, sinon la ligne « Options » est comptée deux fois.
  const vehicleBasePrice = useMemo(() => {
    if (selectedModel && selectedModel.priceFrom != null) {
      return selectedModel.priceFrom
    }
    return vehicle?.basePrice ?? null
  }, [selectedModel, vehicle?.basePrice])

  // ESTIMATION côté client uniquement : le montant facturé est toujours
  // recalculé par le serveur à la création de la session de paiement.
  const totalPrice = useMemo(() => {
    if (vehicleBasePrice == null) return null
    return vehicleBasePrice + accessoriesTotal
  }, [vehicleBasePrice, accessoriesTotal])

  // Couleur de carrosserie peinte dans la vue 360° : on répercute le swatch de
  // la teinte sélectionnée. Résolu ici plutôt que dans la vue, qui ne connaît
  // que le véhicule.
  const bodyColor = useMemo(() => {
    const colour = toList(specs?.exteriorColours).find(
      (item) => item.id === selectedOptions.exteriorColourId,
    )
    return colour?.swatchColor || null
  }, [specs?.exteriorColours, selectedOptions.exteriorColourId])

  // Un seul observer pilote l'onglet actif : on retient le ratio réel de
  // chaque section (et non le simple franchissement du seuil) pour élire la
  // section la plus visible, puis on déconnecte au démontage.
  useEffect(() => {
    if (!vehicle) return undefined
    const sections = tabs.map((tab) =>
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
        if (tabs.includes(tab)) setActiveTab(tab)
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [vehicle, tabs])

  // AutOsave : à chaque changement de configuration, le panier est réécrit en
  // base. Le debounce évite une requête par option cliquée.
  useEffect(() => {
    if (!vehicle) return undefined
    if (!hasInteractedRef.current) {
      hasInteractedRef.current = true
      return undefined
    }
    const timer = setTimeout(() => {
      api
        .post(
          '/cart',
          { vehicleId: vehicle.id, configurationData: selectedOptions },
          { headers: { Authorization: `Bearer ${getAuthToken()}` } },
        )
        .catch((err) => {
          console.error('[configurator] autosave du panier impossible :', err)
        })
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [selectedOptions, vehicle])

  const getDisplayImage = useCallback(() => {
    const colour = toList(specs?.exteriorColours).find(
      (item) => item.id === selectedOptions.exteriorColourId,
    )
    if (activeTab === 'exteriorColours' && colour?.image) return colour.image

    const wheel = toList(specs?.alloyWheels).find(
      (item) => item.id === selectedOptions.alloyWheelId,
    )
    if (activeTab === 'alloyWheels' && wheel?.carImage) return wheel.carImage

    return colour?.image || `/api/vehicles/${vehicle?.id}/image`
  }, [
    activeTab,
    specs?.exteriorColours,
    specs?.alloyWheels,
    selectedOptions.exteriorColourId,
    selectedOptions.alloyWheelId,
    vehicle?.id,
  ])

  const handleSelect = useCallback((tab, id) => {
    const key = TAB_OPTION_KEY[tab]
    if (!key) return
    setSelectedOptions((prev) => ({ ...prev, [key]: id }))
  }, [])

  const handleToggleAccessory = useCallback((id) => {
    setSelectedOptions((prev) => {
      const current = toList(prev.accessoryIds)
      return {
        ...prev,
        accessoryIds: current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id],
      }
    })
  }, [])

  const handleTabSelect = useCallback((tab) => {
    setActiveTab(tab)
    document
      .getElementById(`section-${tab}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleReset = useCallback(() => {
    setSelectedOptions(EMPTY_SELECTION)
    setSelectedFinanceId(null)
    setActiveTab(TABS[0])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Un seul gestionnaire de fermeture partagé : chaque modale reste isolée,
  // fermer l'une n'affecte l'état d'aucune autre.
  const closeModal = useCallback(() => setOpenModal(null), [])

  const activeIndex = Math.max(tabs.indexOf(activeTab), 0)
  const consumption = specs?.technicalData?.consumption

  const renderSection = (tab) => {
    const Dedicated = DEDICATED_SECTIONS[tab]
    if (Dedicated) {
      return (
        <Dedicated
          specs={specs}
          locale={locale}
          selectedId={
            TAB_OPTION_KEY[tab] ? selectedOptions[TAB_OPTION_KEY[tab]] : undefined
          }
          selectedIds={selectedOptions.accessoryIds}
          accessories={accessories}
          onSelect={(id) => handleSelect(tab, id)}
          onToggle={handleToggleAccessory}
        />
      )
    }
    return (
      <OptionSection
        tabKey={tab}
        label={t(`configure.tabs.${tab}`)}
        specs={specs}
        selectedId={
          tab === 'models' ? selectedOptions.modelId ?? defaultModelId : undefined
        }
        onSelect={(id) => handleSelect(tab, id)}
        locale={locale}
      />
    )
  }

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
          tabs={tabs}
          activeTab={activeTab}
          activeIndex={activeIndex}
          onSelect={handleTabSelect}
          onOpen360={() => setShow3D(true)}
          // L'info-bulle seule varie : le bouton reste actif, on n'affiche pas
          // « bientôt disponible » pendant le chargement où l'on ignore tout.
          has3dExterior={vehicle ? Boolean(vehicle.has3dExterior) : true}
        />

        <div className="mx-auto grid w-full max-w-[1800px] gap-8 px-6 md:grid-cols-2">
          <div
            className="sticky h-[70vh] self-start"
            style={{ top: SCROLL_OFFSET }}
          >
            <ConfiguratorImage vehicle={vehicle} imageSrc={getDisplayImage()} />
          </div>

          <div>
            {tabs.map((tab) => (
              <section
                key={tab}
                id={`section-${tab}`}
                className="min-h-screen"
                style={{ scrollMarginTop: SCROLL_OFFSET }}
              >
                {renderSection(tab)}
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
        basePrice={vehicleBasePrice ?? 0}
        accessories={accessories}
        selectedIds={selectedOptions.accessoryIds}
        locale={locale}
        onClose={closeModal}
      />
      <SaveConfigurationModal
        open={openModal === 'saveConfiguration'}
        vehicle={vehicle}
        onClose={closeModal}
      />

      {show3D && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0b0f]">
              <LoadingSpinner3D />
            </div>
          }
        >
          <ThreeSixtyViewer
            vehicle={vehicle}
            bodyColor={bodyColor}
            onClose={() => setShow3D(false)}
          />
        </Suspense>
      )}
    </div>
  )
}

export default Configure
