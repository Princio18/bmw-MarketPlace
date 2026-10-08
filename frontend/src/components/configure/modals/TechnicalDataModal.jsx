import { useTranslation } from 'react-i18next'
import Modal from '../../shared/Modal'

// Une section = un titre + une liste de paires [clé i18n, chemin dans specs].
// Le rendu est piloté par ces tableaux : l'ordre des sections et des lignes
// suit exactement les captures BMW, et toute clé absente affiche « — ».
const SECTIONS = [
  {
    key: 'engine',
    rows: [
      ['performance', 'performance'],
      ['torque', 'torque'],
      ['fuelType', 'fuelType'],
      ['transmission', 'transmission'],
    ],
  },
  {
    key: 'consumption',
    rows: [
      ['energyConsumption', 'wltpEnergyConsumption'],
      ['co2', 'wltpCO2'],
      ['passByNoise', 'passByNoise'],
    ],
    note: 'consumptionNote',
  },
  {
    key: 'electricRange',
    rows: [
      ['wltpRange', 'wltpRange'],
      ['batterySizeGross', 'batterySizeGross'],
      ['batterySizeNet', 'batterySizeNet'],
      ['chargingTimeAC', 'chargingTimeAC'],
      ['maxChargingAC', 'maxChargingAC'],
      ['chargingTimeDC', 'chargingTimeDC'],
      ['maxChargingDC', 'maxChargingDC'],
      ['addedRange10Min', 'addedRange10Min'],
    ],
    note: 'addedRangeNote',
  },
  {
    key: 'performanceWeight',
    rows: [
      ['unladenWeight', 'unladenWeight'],
      ['axleLoad', 'axleLoad'],
      ['acceleration', 'acceleration'],
      ['permittedLoad', 'permittedLoad'],
      ['payload', 'payload'],
      ['maxTrailerLoad', 'maxTrailerLoad'],
      ['trailerLoadUnbraked', 'trailerLoadUnbraked'],
    ],
  },
  {
    key: 'dimensions',
    rows: [
      ['lengthWidthHeight', 'lengthWidthHeight'],
      ['widthMirrorsDriver', 'widthMirrorsDriver'],
      ['widthMirrorsPassenger', 'widthMirrorsPassenger'],
      ['seats', 'seats'],
      ['wheelbase', 'wheelbase'],
      ['luggageCapacity', 'luggageCapacity'],
    ],
  },
]

const PLACEHOLDER = '—'

function TechnicalDataModal({ open, specs, onClose }) {
  const { t } = useTranslation()
  const technicalData = specs?.technicalData ?? {}

  const visibleSections = SECTIONS.filter(
    (section) => section.key !== 'electricRange' || technicalData.electricRange != null,
  )

  return (
    <Modal
      open={open}
      title={t('configure.technicalData.title')}
      onClose={onClose}
    >
      <div className="space-y-8">
        {visibleSections.map((section) => {
          const group = technicalData[section.key] ?? {}
          return (
            <section key={section.key}>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-900">
                {t(`configure.technicalData.sections.${section.key}`)}
              </h3>
              <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                {section.rows.map(([rowKey, path]) => (
                  <div key={rowKey}>
                    <p className="text-xs text-gray-500">
                      {t(`configure.technicalData.rows.${rowKey}`)}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {group[path] ?? PLACEHOLDER}
                    </p>
                  </div>
                ))}
              </div>
              {section.note && (
                <p className="mt-3 text-xs italic text-gray-500">
                  {t(`configure.technicalData.notes.${section.note}`)}
                </p>
              )}
            </section>
          )
        })}
      </div>
    </Modal>
  )
}

export default TechnicalDataModal
