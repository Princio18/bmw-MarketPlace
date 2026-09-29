import { useTranslation } from 'react-i18next'
import Modal from '../../shared/Modal'

const LISTS = [
  ['exterior', 'exterior'],
  ['interior', 'interior'],
  ['driveSuspension', 'driveSuspension'],
]

function StandardEquipmentModal({ open, vehicle, onClose }) {
  const { t } = useTranslation()
  const standardEquipment = vehicle?.specs?.standardEquipment ?? {}

  return (
    <Modal
      open={open}
      title={t('configure.standardEquipment.title')}
      onClose={onClose}
    >
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <img
          src={`/api/vehicles/${vehicle?.id}/image`}
          alt={`BMW ${vehicle?.modelName ?? ''}`.trim()}
          className="h-40 w-full rounded object-cover"
        />

        <div>
          <p className="text-sm text-gray-700">
            {t('configure.standardEquipment.intro')}
          </p>

          <div className="mt-5 space-y-5">
            {LISTS.map(([key, path]) => {
              const items = Array.isArray(standardEquipment[path])
                ? standardEquipment[path]
                : []
              return (
                <div key={key}>
                  <h3 className="text-sm font-bold text-gray-900">
                    {t(`configure.standardEquipment.sections.${key}`)}
                  </h3>
                  <ul className="mt-2 space-y-1">
                    {items.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2 text-sm text-gray-700"
                      >
                        <span aria-hidden="true" className="text-gray-400">
                          •
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default StandardEquipmentModal
