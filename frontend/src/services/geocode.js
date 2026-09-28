// Service de géocodage — OSM Nominatim (gratuit, sans clé).
// Interface : geocode(query) → { latitude: number, longitude: number, label: string } | null.
// Le code d'implémentation peut être remplacé par Google / Mapbox / Here
// sans toucher aux composants, tant que le contrat (forme de retour) est respecté.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const ACCEPT_LANGUAGE = 'fr-FR,fr,en;q=0.9'

/**
 * Recherche une adresse / code postal / nom de lieu et renvoie le premier
 * résultat (lat, lng, label). Renvoie `null` si aucune correspondance ou
 * en cas d'erreur réseau.
 */
export async function geocode(query, { limit = 3 } = {}) {
  if (!query || typeof query !== 'string' || !query.trim()) return null

  const params = new URLSearchParams({
    q: query.trim(),
    format: 'jsonv2',
    limit: String(Math.min(Math.max(limit, 1), 10)),
  })

  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: { 'Accept-Language': ACCEPT_LANGUAGE },
  })
  if (!res.ok) return null

  const results = await res.json()
  if (!Array.isArray(results) || results.length === 0) return null

  const { lat, lon, display_name } = results[0]
  return {
    latitude: Number(lat),
    longitude: Number(lon),
    label: display_name || query.trim(),
  }
}

export default geocode