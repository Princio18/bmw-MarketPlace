import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker as LeafletMarker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// Fix obligatoire des icônes Leaflet : sans ces imports, les marqueurs sans
// icône explicite affichent le caractère « garbage » (icône introuvable au
// build). Vite fournit les URLs des PNG embarqués dans le paquet leaflet.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const PIN_SVG = `
  <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 0C7.6 0 0 7.2 0 16.2c0 11.4 15.4 27.1 16.3 28.1.4.5 1 .5 1.4 0C18.6 43.3 34 27.6 34 16.2 34 7.2 26.4 0 17 0Z" fill="#0066b1"/>
    <circle cx="17" cy="16.5" r="6.5" fill="#ffffff"/>
  </svg>
`

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:34px;height:44px;transform:translate(-50%,-100%)">${PIN_SVG}</div>`,
  iconSize: [34, 44],
  iconAnchor: [17, 44],
  popupAnchor: [0, -40],
})

// Variante du pin avec un halo vert : identifie visuellement le centre choisi.
const selectedPinIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:34px;height:44px;transform:translate(-50%,-100%)">
      <span style="position:absolute;left:50%;top:16px;transform:translate(-50%,-50%);width:46px;height:46px;border-radius:9999px;background:rgba(22,163,74,.28)"></span>
      ${PIN_SVG}
    </div>
  `,
  iconSize: [34, 44],
  iconAnchor: [17, 44],
  popupAnchor: [0, -40],
})

const inputCls =
  'w-full rounded-sm border border-gray-400 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none'

// Carte + panneau de recherche des concessions BMW (GET /api/dealers).
// Le centre sélectionné est remonté au formulaire parent via onSelectDealer.
function DealerMapPicker({ selectedDealerId, onSelectDealer, showError }) {
  const { t } = useTranslation()
  const [dealers, setDealers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [postcode, setPostcode] = useState('')
  const [query, setQuery] = useState('')
  const markerRefs = useRef({})

  const loadDealers = () => {
    setLoading(true)
    setLoadError(false)
    api
      .get('/dealers')
      .then(({ data }) => setDealers(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let alive = true
    api
      .get('/dealers')
      .then(({ data }) => {
        if (alive) setDealers(data)
      })
      .catch(() => {
        if (alive) setLoadError(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const visibleDealers = useMemo(() => {
    const needle = `${query} ${postcode}`.toLowerCase()
    if (!needle.trim()) return dealers
    return dealers.filter((d) =>
      `${d.name} ${d.city}`.toLowerCase().includes(needle.trim()),
    )
  }, [dealers, query, postcode])

  const selectedDealer = useMemo(
    () => dealers.find((d) => d.id === selectedDealerId) || null,
    [dealers, selectedDealerId],
  )

  useEffect(() => {
    const marker = selectedDealerId ? markerRefs.current[selectedDealerId] : null
    if (marker) marker.openPopup()
  }, [selectedDealerId])

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <div className="w-full space-y-3 md:w-72">
        <input
          type="search"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder={t('confirmRequest.postcodePlaceholder')}
          className={inputCls}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('confirmRequest.searchRetailerPlaceholder')}
          className={inputCls}
        />

        {loading && (
          <p className="text-sm text-gray-500">
            {t('confirmRequest.dealersLoading')}
          </p>
        )}

        {loadError && (
          <div className="rounded-sm border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">
              {t('confirmRequest.dealersError')}
            </p>
            <button
              type="button"
              onClick={loadDealers}
              className="mt-2 text-sm font-semibold text-blue-600 hover:underline"
            >
              {t('confirmRequest.retry')}
            </button>
          </div>
        )}

        <ul className="max-h-64 space-y-1 overflow-y-auto pr-1 md:max-h-80">
          {visibleDealers.map((dealer) => (
            <li key={dealer.id}>
              <button
                type="button"
                onClick={() => onSelectDealer(dealer.id)}
                className={`flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-sm transition ${
                  dealer.id === selectedDealerId
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-800 hover:bg-gray-100'
                }`}
              >
                <span
                  className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border ${
                    dealer.id === selectedDealerId
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-400'
                  }`}
                />
                <span>
                  <span className="block font-medium">{dealer.name}</span>
                  <span className="block text-xs text-gray-500">
                    {dealer.city}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1">
        <MapContainer
          center={[54.5, -3]}
          zoom={6}
          scrollWheelZoom
          className="z-0 h-[430px] w-full rounded-sm"
        >
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
          {visibleDealers.map((dealer) => {
            const isSelected = dealer.id === selectedDealerId
            return (
              <LeafletMarker
                key={dealer.id}
                position={[Number(dealer.latitude), Number(dealer.longitude)]}
                icon={isSelected ? selectedPinIcon : pinIcon}
                zIndexOffset={isSelected ? 1000 : 0}
                ref={(marker) => {
                  if (marker) markerRefs.current[dealer.id] = marker
                  else delete markerRefs.current[dealer.id]
                }}
              >
                <Popup className="bmw-centre-popup">
                  <div className="px-1 py-0.5">
                    <p className="font-semibold text-gray-900">
                      {dealer.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">{dealer.city}</p>
                    <button
                      type="button"
                      onClick={() => onSelectDealer(dealer.id)}
                      className={`mt-3 w-full rounded-sm px-3 py-1.5 text-xs font-semibold text-white transition ${
                        isSelected
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isSelected
                        ? t('confirmRequest.selectedCentreConfirmed')
                        : t('confirmRequest.selectCentre')}
                    </button>
                  </div>
                </Popup>
              </LeafletMarker>
            )
          })}
        </MapContainer>

        {selectedDealer && (
          <p className="mt-3 text-sm font-medium text-green-700">
            {t('confirmRequest.selectedCentre', {
              name: selectedDealer.name,
              city: selectedDealer.city,
            })}
          </p>
        )}
        {showError && !selectedDealer && (
          <p className="mt-3 text-sm font-medium text-red-600">
            {t('confirmRequest.errors.centreRequired')}
          </p>
        )}
      </div>
    </div>
  )
}

export default DealerMapPicker