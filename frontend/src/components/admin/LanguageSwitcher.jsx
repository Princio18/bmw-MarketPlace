import { useTranslation } from 'react-i18next'

function LanguageSwitcher() {
  const { i18n } = useTranslation('admin')
  const current = i18n.resolvedLanguage || i18n.language

  return (
    <div className="flex items-center rounded border border-zinc-300 text-xs font-semibold hover:border-zinc-400 dark:border-gray-600 dark:hover:border-gray-500">
      {(['en', 'fr']).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => i18n.changeLanguage(lang)}
          aria-pressed={current === lang}
          className={`px-2.5 py-1.5 uppercase leading-none transition ${
            current === lang
              ? 'bg-bmw-blue text-white'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  )
}

export default LanguageSwitcher