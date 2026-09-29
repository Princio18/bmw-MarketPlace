import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const IDLE_TIMEOUT = 5 * 60 * 60 * 1000
const ACTIVITY_EVENTS = [
  'mousemove',
  'keydown',
  'click',
  'scroll',
  'touchstart',
]

// Déconnexion automatique après 5 h d'inactivité. À appeler une seule fois,
// à la racine de l'application (composant à la fois sous AuthProvider et le
// routeur), pour ne pas dupliquer les timers.
export function useIdleLogout() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const timeoutRef = useRef(null)

  useEffect(() => {
    // Le minuteur ne démarre jamais pour un visiteur non connecté.
    if (!isAuthenticated) return undefined

    function resetTimer() {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        logout()
        navigate('/login?reason=session_expired')
      }, IDLE_TIMEOUT)
    }

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer),
    )
    resetTimer()

    return () => {
      clearTimeout(timeoutRef.current)
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer),
      )
    }
    // `logout` est volontairement hors dépendances : AuthProvider le
    // recrée à chaque render, l'inclure relancerait l'effet à chaque fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])
}
