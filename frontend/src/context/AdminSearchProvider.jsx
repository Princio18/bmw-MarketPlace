import { useMemo, useState } from 'react'
import { AdminSearchContext } from './adminSearchContext'

export function AdminSearchProvider({ children }) {
  const [query, setQuery] = useState('')

  const value = useMemo(() => ({ query, setQuery }), [query])

  return (
    <AdminSearchContext.Provider value={value}>{children}</AdminSearchContext.Provider>
  )
}