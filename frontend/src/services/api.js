import axios from 'axios'
import { getAuthToken } from '../lib/authToken'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// Attache systématiquement le token à chaque requête : les headers calculés
// une seule fois en tête de module (const authHeader = ...getAuthToken()) se
// figeaient à une valeur vide (Bearer ) lorsque le module était chargé avant
// la fin du login, ce qui provoquait un 401 sur toutes les pages admin.
api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api