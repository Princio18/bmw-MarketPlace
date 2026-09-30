import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FALLBACK_IMAGE,
  SectionEmpty,
  SectionHeader,
  SubTabs,
  SwatchGrid,
  toList,
} from './sectionParts'

const CATEGORIES = [
  { id: 'show-all', labelKey: 'showAll' },
  { id: 'leatherette', labelKey: 'leatherette' },
  { id: 'cloth', labelKey: 'cloth' },
  { id: 'leather', labelKey: 'leather' },
  { id: 'bmw-individual', labelKey: 'bmwIndividual' },
]

function UpholsteryPreview({ upholstery }) {
  const { t } = useTranslation()
  if (!upholstery) return null
  return (
    <div className="mt-4 flex items-center gap-4 rounded-sm border border-gray-200 p-4">
      <img
        src={upholstery.image || FALLBACK_IMAGE}
        alt={upholstery.name}
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = FALLBACK_IMAGE
        }}
        className="h-20 w-20 shrink-0 rounded-sm bg-gray-50 object-contain"
      />
      <span
        aria-hidden="true"
        className="h-10 w-10 shrink-0 rounded-full border border-gray-300"
        style={{ background: upholstery.swatchColor || '#e5e7eb' }}
      />
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-900">{upholstery.name}</p>
        {upholstery.code && (
          <p className="text-xs text-gray-500">
            {t('configure.section.paintCode', { code: upholstery.code })}
          </p>
        )}
      </div>
    </div>
  )
}

function UpholsterySection({ specs, selectedId, onSelect }) {
  const { t } = useTranslation()
  const upholstery = toList(specs?.upholstery)
  const [category, setCategory] = useState('show-all')
  const title = t('configure.tabs.upholstery')

  const visible = useMemo(
    () =>
      category === 'show-all'
        ? upholstery
        : upholstery.filter((item) => item.category === category),
    [upholstery, category],
  )

  useEffect(() => {
    if (selectedId && !visible.some((item) => item.id === selectedId)) {
      setCategory('show-all')
    }
  }, [selectedId, visible])

  if (upholstery.length === 0) {
    return <SectionEmpty title={title} message={t('configure.section.empty')} />
  }

  const active =
    upholstery.find((item) => item.id === selectedId) || visible[0] || upholstery[0]

  return (
    <div>
      <SectionHeader title={title} />

      <SubTabs categories={CATEGORIES} active={category} onChange={setCategory} />

      <UpholsteryPreview upholstery={active} />

      {visible.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500">{t('configure.section.empty')}</p>
      ) : (
        <SwatchGrid items={visible} selectedId={selectedId} onSelect={onSelect} />
      )}
    </div>
  )
}

export default UpholsterySection
