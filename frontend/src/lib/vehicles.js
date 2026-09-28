import api from '../services/api'

export function fetchVehicleCatalog() {
  return Promise.all([
    api.get('/vehicles'),
    api.get('/vehicles/price-range'),
  ])
}