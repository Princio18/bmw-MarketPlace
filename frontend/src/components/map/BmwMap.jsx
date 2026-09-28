import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import CentreMarker from './CentreMarker'
import FlyToController from './FlyToController'

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// Carte réutilisable : l'implémentation (react-leaflet / OpenStreetMap) reste
// confinée ici. Pour passer à Google Maps / Mapbox plus tard, seul ce composant
// change (mêmes props : centres, center, onBookService).
function BmwMap({
  centres = [],
  center = { latitude: 48.8566, longitude: 2.3522 },
  zoom = 6,
  onBookService,
}) {
  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={zoom}
      scrollWheelZoom
      className="z-0 h-full w-full"
    >
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      <FlyToController center={center} />
      {centres.map((centre) => (
        <CentreMarker
          key={centre.name}
          centre={centre}
          onBookService={onBookService}
        />
      ))}
    </MapContainer>
  )
}

export default BmwMap