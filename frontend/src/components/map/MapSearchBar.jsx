import { useState } from 'react'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function MapSearchBar({ onSearch, loading = false }) {
  const [query, setQuery] = useState('')
  const { t } = useTranslation()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim() && !loading) {
      onSearch(query.trim())
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="absolute left-1/2 top-4 z-[1000] flex w-[90%] -translate-x-1/2 items-center gap-2 rounded-lg bg-white/90 px-3 shadow-lg backdrop-blur dark:bg-gray-900/90 sm:w-[55%] md:w-[52%]"
    >
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('map.searchPlaceholder')}
        aria-label={t('map.searchPlaceholder')}
        className="h-12 w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-500 md:text-[15px] dark:text-white dark:placeholder:text-gray-400"
      />
      <button
        type="submit"
        aria-label={t('map.searchAria')}
        disabled={loading || !query.trim()}
        className="flex shrink-0 cursor-pointer items-center justify-center text-gray-700 transition hover:text-bmw-blue disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300"
      >
        <Search size={22} strokeWidth={2} />
      </button>
    </form>
  )
}

export default MapSearchBar