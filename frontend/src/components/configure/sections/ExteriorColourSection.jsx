import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CompareButton,
  SectionEmpty,
  SectionHeader,
  SubTabs,
  SwatchGrid,
  toList,
} from './sectionParts'

const CATEGORIES = [
  { id: 'show-all', labelKey: 'showAll' },
  { id: 'metallic', labelKey: 'metallic' },
  { id: 'bmw-individual', labelKey: 'bmwIndividual' },
]

function ColourPreview({ colour }) {
  const { t } = useTranslation()
  if (!colour) return null
  return (
    <div className="mt-4 flex items-center gap-4 rounded-sm border border-gray-200 p-4">
      <span
        aria-hidden="true"
        className="h-12 w-12 shrink-0 rounded-full border border-gray-300"
        style={{ background: colour.swatchColor || '#e5e7eb' }}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-gray-900">{colour.name}</p>
        {colour.code && (
          <p className="text-xs text-gray-500">
            {t('configure.section.paintCode', { code: colour.code })}
          </p>
        )}
      </div>
    </div>
  )
}

function ExteriorColourSection({ specs, selectedId, onSelect }) {
  const { t } = useTranslation()
  const colours = toList(specs?.exteriorColours)
  const [category, setCategory] = useState('show-all')
  const title = t('configure.tabs.exteriorColours')

  const visible = useMemo(
    () =>
      category === 'show-all'
        ? colours
        : colours.filter((colour) => colour.category === category),
    [colours, category],
  )

  // Si le sous-onglet courant ne contient plus la sélection (changement de
  // catégorie, specs rechargées), on revient sur « Show all » plutôt que
  // d'afficher un aperçu incohérent.
  useEffect(() => {
    if (selectedId && !visible.some((colour) => colour.id === selectedId)) {
      setCategory('show-all')
    }
  }, [selectedId, visible])

  if (colours.length === 0) {
    return <SectionEmpty title={title} message={t('configure.section.empty')} />
  }

  const active =
    colours.find((colour) => colour.id === selectedId) || visible[0] || colours[0]

  return (
    <div>
      <SectionHeader title={title}>
        <CompareButton />
      </SectionHeader>

      <SubTabs
        categories={CATEGORIES}
        active={category}
        onChange={setCategory}
      />

      <ColourPreview colour={active} />

      {visible.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500">{t('configure.section.empty')}</p>
      ) : (
        <SwatchGrid
          items={visible}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      )}
    </div>
  )
}

export default ExteriorColourSection
