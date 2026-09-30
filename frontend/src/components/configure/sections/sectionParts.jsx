import { useTranslation } from 'react-i18next'

export const FALLBACK_IMAGE = '/images/placeholder-vehicle.svg'

// Les fonds de carte et les séparateurs sont factorisés ici : les cinq
// onglets dédiés partagent exactement la même charte visuelle.
export const SUBTAB_BASE =
  'shrink-0 rounded-sm px-4 py-1.5 text-xs font-semibold transition'

export function SectionHeader({ title, children }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  )
}

// Fallback obligatoire : un tableau vide ne doit JAMAIS faire planter la page.
export function SectionEmpty({ title, message }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      <p className="mt-4 text-sm text-gray-500">{message}</p>
    </div>
  )
}

// Barre de sous-onglets (Show all / Metallic / BMW Individual...).
// `categories` = [{ id, labelKey }] ; l'onglet actif filtre la liste.
export function SubTabs({ categories, active, onChange }) {
  const { t } = useTranslation()
  return (
    <div className="mt-4 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
      {categories.map((category) => {
        const isActive = category.id === active
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            aria-pressed={isActive}
            className={
              isActive
                ? `${SUBTAB_BASE} bg-blue-600 text-white`
                : `${SUBTAB_BASE} bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900`
            }
          >
            {t(`configure.subtabs.${category.labelKey}`)}
          </button>
        )
      })}
    </div>
  )
}

// Grille de pastilles (couleurs / selleries) : rond coloré + coche sur
// l'élément sélectionné. `swatchColor` peut être une valeur CSS (`#hex`) ou un
// `conic-gradient` — dans ce dernier cas on l'applique en `background`.
export function SwatchGrid({ items, selectedId, onSelect, size = 'h-11 w-11' }) {
  return (
    <div className="mt-5 grid grid-cols-4 gap-4 sm:grid-cols-6 md:grid-cols-8">
      {items.map((item) => {
        const isSelected = item.id === selectedId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            title={item.name}
            aria-label={item.name}
            aria-pressed={isSelected}
            className="group flex flex-col items-center gap-2"
          >
            <span className="relative flex items-center justify-center">
              <span
                className={`${size} rounded-full border transition ${isSelected ? 'border-blue-600 ring-2 ring-blue-600 ring-offset-2' : 'border-gray-300 group-hover:border-gray-500'}`}
                style={{ background: item.swatchColor || '#e5e7eb' }}
              />
              {isSelected && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute h-4 w-4 text-blue-700"
                >
                  <svg viewBox="0 0 20 20" fill="none" className="h-full w-full">
                    <path
                      d="M4 10.5 8 14.5 16 6"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
            </span>
            <span className="text-center text-[10px] leading-tight text-gray-500">
              {item.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// Grille de vignettes (jantes) : image + coche sur la sélection.
export function ThumbnailGrid({ items, selectedId, onSelect }) {
  return (
    <div className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-4">
      {items.map((item) => {
        const isSelected = item.id === selectedId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            title={item.name}
            aria-label={item.name}
            aria-pressed={isSelected}
            className={
              isSelected
                ? 'relative flex flex-col items-center gap-2 rounded-sm border-2 border-blue-600 bg-white p-2'
                : 'relative flex flex-col items-center gap-2 rounded-sm border border-gray-200 bg-white p-2 transition hover:border-gray-400'
            }
          >
            <span className="relative flex h-16 w-16 items-center justify-center">
              <img
                src={item.thumbnail || item.image || FALLBACK_IMAGE}
                alt={item.name}
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = FALLBACK_IMAGE
                }}
                className="h-16 w-16 object-contain"
              />
              {isSelected && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white"
                >
                  <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3">
                    <path
                      d="M4 10.5 8 14.5 16 6"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
            </span>
            <span className="line-clamp-2 text-center text-[10px] leading-tight text-gray-500">
              {item.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// Bouton "Compare" : purement visuel à ce stade (aucune modale associée).
export function CompareButton({ label }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={(e) => e.preventDefault()}
      className="shrink-0 rounded-sm border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-gray-500 hover:text-gray-900"
    >
      {label || t('configure.section.compare')}
    </button>
  )
}

export function ShowDetailsButton() {
  const { t } = useTranslation()
  return (
    <span
      role="button"
      tabIndex={-1}
      className="mt-4 block border-t border-gray-200 pt-2 text-center text-xs font-semibold text-gray-700"
    >
      {t('configure.section.showDetails')}
    </span>
  )
}

// Extrait un tableau de specs sans jamais lever : `specs` peut être null ou
// porter une valeur d'un autre type selon le véhicule.
export function toList(value) {
  return Array.isArray(value) ? value : []
}
