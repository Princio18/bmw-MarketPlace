import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

const DEFAULT_ZOOM = 12

// Recentre la carte quand la prop `center` change (résultat de recherche,
// sélection d'un centre, etc.) à l'aide d'un déplacement animé.
function FlyToController({ center }) {
  const map = useMap()

  useEffect(() => {
    if (center) {
      map.flyTo([center.latitude, center.longitude], DEFAULT_ZOOM, {
        duration: 1.2,
      })
    }
  }, [map, center])

  return null
}

export default FlyToController