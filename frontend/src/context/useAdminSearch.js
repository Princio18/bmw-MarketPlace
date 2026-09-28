import { useContext } from 'react'
import { AdminSearchContext } from './adminSearchContext'

export function useAdminSearch() {
  const ctx = useContext(AdminSearchContext)
  if (!ctx) {
    throw new Error('useAdminSearch must be used within AdminSearchProvider')
  }
  return ctx
}