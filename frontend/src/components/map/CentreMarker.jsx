import { Marker as LeafletMarker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'

const pinIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:34px;height:44px;transform:translate(-50%,-100%)">
      <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 0C7.6 0 0 7.2 0 16.2c0 11.4 15.4 27.1 16.3 28.1.4.5 1 .5 1.4 0C18.6 43.3 34 27.6 34 16.2 34 7.2 26.4 0 17 0Z" fill="#0066b1"/>
        <circle cx="17" cy="16.5" r="6.5" fill="#ffffff"/>
      </svg>
    </div>
  `,
  iconSize: [34, 44],
  iconAnchor: [17, 44],
  popupAnchor: [0, -40],
})

function CentreMarker({ centre, onBookService }) {
  const { t } = useTranslation()
  return (
    <LeafletMarker
      position={[centre.latitude, centre.longitude]}
      icon={pinIcon}
      title={centre.name}
    >
      <Popup className="bmw-centre-popup">
        <div className="px-1 py-0.5">
          <p className="font-semibold text-gray-900 dark:text-white">
            {centre.name}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
            {centre.address}
          </p>
          {centre.phone && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
              {centre.phone}
            </p>
          )}
          {onBookService && (
            <button
              type="button"
              onClick={() => onBookService(centre)}
              className="mt-3 w-full rounded-sm bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-bmw-blue"
            >
              {t('map.bookService')}
            </button>
          )}
        </div>
      </Popup>
    </LeafletMarker>
  )
}

export default CentreMarker