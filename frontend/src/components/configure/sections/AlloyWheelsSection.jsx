import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '../../../lib/price'
import {
  CompareButton,
  FALLBACK_IMAGE,
  SectionEmpty,
  SectionHeader,
  SubTabs,
  ThumbnailGrid,
  toList,
} from './sectionParts'

const CATEGORIES = [
  { id: 'show-all', labelKey: 'showAll' },
  { id: '20', labelKey: 'size20' },
  { id: '21', labelKey: 'size21' },
]

function ActiveWheelCard({ wheel, locale }) {
  const { t } = useTranslation()
  return (
    <div className="mt-4 flex items-center gap-4 rounded-sm border border-gray-200 p-4">
      <img
        src={wheel.carImage || wheel.thumbnail || FALLBACK_IMAGE}
        alt={wheel.name}
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = FALLBACK_IMAGE
        }}
        className="h-20 w-20 shrink-0 rounded-sm bg-gray-50 object-contain"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900">{wheel.name}</p>
        <p className="mt-1 text-sm text-gray-500">
          {Number(wheel.price) > 0
            ? t('configure.section.from', {
                price: formatPrice(wheel.price, locale),
              })
            : t('configure.section.included')}
        </p>
      </div>
    </div>
  )
}

function AlloyWheelsSection({ specs, selectedId, onSelect, locale }) {
  const { t } = useTranslation()
  const wheels = toList(specs?.alloyWheels)
  const [category, setCategory] = useState('show-all')
  const title = t('configure.tabs.alloyWheels')

  const visible = useMemo(
    () =>
      category === 'show-all'
        ? wheels
        : wheels.filter((wheel) => wheel.category === category),
    [wheels, category],
  )

  useEffect(() => {
    if (selectedId && !visible.some((wheel) => wheel.id === selectedId)) {
      setCategory('show-all')
    }
  }, [selectedId, visible])

  if (wheels.length === 0) {
    return <SectionEmpty title={title} message={t('configure.section.empty')} />
  }

  const active =
    wheels.find((wheel) => wheel.id === selectedId) || visible[0] || wheels[0]

  return (
    <div>
      <SectionHeader title={title}>
        <CompareButton />
      </SectionHeader>

      <SubTabs categories={CATEGORIES} active={category} onChange={setCategory} />

      <ActiveWheelCard wheel={active} locale={locale} />

      {visible.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500">{t('configure.section.empty')}</p>
      ) : (
        <ThumbnailGrid
          items={visible}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      )}
    </div>
  )
}

export default AlloyWheelsSection
