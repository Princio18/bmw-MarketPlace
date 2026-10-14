import { useEffect, useRef, useState } from 'react'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

// Pastille du nombre de demandes non traitées, rafraîchie toutes les 60 s.
// Montée uniquement quand l'admin a la permission de gérer les commandes.
function NewRequestsBadge() {
  const [count, setCount] = useState(0)
  const loadRef = useRef()

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/admin/requests/summary', authHeader)
        setCount(Number(data.newCount) || 0)
      } catch {
        /* silencieux : la pastille reste inchangée en cas d'échec */
      }
    }
    loadRef.current = load
    load()
    const interval = setInterval(() => loadRef.current(), 60000)
    return () => clearInterval(interval)
  }, [])

  if (count === 0) return null

  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
      {count}
    </span>
  )
}

export default NewRequestsBadge
