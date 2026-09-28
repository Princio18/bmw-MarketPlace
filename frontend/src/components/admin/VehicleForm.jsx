import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/services/api'

const CATEGORIES = ['SUV', 'Touring', 'Saloon', 'Coupé', 'Hatch', 'Convertible']
const SERIES = ['X', '1', '2', '3', '4', '5', '7', '8', 'Z']
const DRIVETRAINS = [
  { value: 'electric', labelKey: 'vehicleForm.drivetrainElectric' },
  { value: 'hybrid', labelKey: 'vehicleForm.drivetrainHybrid' },
  { value: 'petrol', labelKey: 'vehicleForm.drivetrainPetrol' },
  { value: 'diesel', labelKey: 'vehicleForm.drivetrainDiesel' },
  { value: 'concept', labelKey: 'vehicleForm.drivetrainConcept' },
  { value: 'protection', labelKey: 'vehicleForm.drivetrainProtection' },
]

function getAuthToken() {
  return (
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('authToken') ||
    ''
  )
}

function emptyValues() {
  return {
    modelName: '',
    category: CATEGORIES[0],
    series: SERIES[0],
    variantLabel: '',
    drivetrain: 'electric',
    isNew: false,
    isMPerformance: false,
    basePrice: '',
    imageFile: null,
  }
}

function VehicleForm({ vehicle, onSuccess }) {
  const { t } = useTranslation()
  const isEdit = Boolean(vehicle)
  const [values, setValues] = useState({
    modelName: vehicle?.modelName || '',
    category: vehicle?.category || CATEGORIES[0],
    series: vehicle?.series || SERIES[0],
    variantLabel: vehicle?.variantLabel || '',
    drivetrain: vehicle?.drivetrain || 'electric',
    isNew: Boolean(vehicle?.isNew),
    isMPerformance: Boolean(vehicle?.isMPerformance),
    basePrice: vehicle?.basePrice ?? '',
    imageFile: null,
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [serverError, setServerError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const revokeRef = useRef('')

  useEffect(() => {
    return () => {
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current)
      }
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckbox = (e) => {
    const { name, checked } = e.target
    setValues((prev) => ({ ...prev, [name]: checked }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null
    setValues((prev) => ({ ...prev, imageFile: file }))
    if (revokeRef.current) {
      URL.revokeObjectURL(revokeRef.current)
    }
    const next = file ? URL.createObjectURL(file) : ''
    revokeRef.current = next
    setPreviewUrl(next)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const nextErrors = {}
    if (!values.modelName.trim()) {
      nextErrors.modelName = t('vehicleForm.modelNameRequired')
    }
    const parsedPrice =
      values.basePrice === '' ? null : values.basePrice

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || submitting) {
      return
    }

    const payload = new FormData()
    payload.append('modelName', values.modelName.trim())
    payload.append('category', values.category)
    payload.append('series', values.series)
    payload.append('variantLabel', values.variantLabel.trim() || 'Models')
    payload.append('drivetrain', values.drivetrain)
    payload.append('isNew', String(values.isNew))
    payload.append('isMPerformance', String(values.isMPerformance))
    if (parsedPrice !== null) {
      payload.append('basePrice', String(parsedPrice))
    }
    if (values.imageFile) {
      payload.append('image', values.imageFile)
    }

    const method = isEdit ? 'put' : 'post'
    const url = isEdit
      ? `/admin/vehicles/${vehicle.id}`
      : '/admin/vehicles'

    setSubmitting(true)
    setServerError('')
    setSuccess('')
    try {
      const { data } = await api[method](url, payload, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      onSuccess?.(data)
      if (!isEdit) {
        setValues(emptyValues())
      }
      setSuccess(t(isEdit ? 'vehicleForm.updated' : 'vehicleForm.created'))
    } catch (err) {
      setServerError(err.response?.data?.error || t('vehicleForm.genericError'))
    } finally {
      setSubmitting(false)
    }
  }

  const selectClass =
    'mt-2 h-11 w-full rounded-md border border-input bg-transparent px-3 text-base text-gray-900 shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm'

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="vehicleModelName" className="text-sm font-medium text-gray-800">
          {t('vehicleForm.modelName')}*
        </label>
        <Input
          id="vehicleModelName"
          name="modelName"
          type="text"
          autoComplete="off"
          value={values.modelName}
          onChange={handleChange}
          aria-invalid={Boolean(errors.modelName)}
          className="mt-2 h-11 px-4"
        />
        {errors.modelName && (
          <p className="mt-1.5 text-xs text-destructive">{errors.modelName}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="vehicleCategory" className="text-sm font-medium text-gray-800">
            {t('vehicleForm.category')}*
          </label>
          <select
            id="vehicleCategory"
            name="category"
            value={values.category}
            onChange={handleChange}
            className={selectClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="vehicleSeries" className="text-sm font-medium text-gray-800">
            {t('vehicleForm.series')}*
          </label>
          <select
            id="vehicleSeries"
            name="series"
            value={values.series}
            onChange={handleChange}
            className={selectClass}
          >
            {SERIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="vehicleVariant" className="text-sm font-medium text-gray-800">
          {t('vehicleForm.variantLabel')}
        </label>
        <Input
          id="vehicleVariant"
          name="variantLabel"
          type="text"
          autoComplete="off"
          placeholder={t('vehicleForm.variantPlaceholder')}
          value={values.variantLabel}
          onChange={handleChange}
          className="mt-2 h-11 px-4"
        />
      </div>

      <div>
        <label htmlFor="vehicleDrivetrain" className="text-sm font-medium text-gray-800">
          {t('vehicleForm.drivetrain')}*
        </label>
        <select
          id="vehicleDrivetrain"
          name="drivetrain"
          value={values.drivetrain}
          onChange={handleChange}
          className={selectClass}
        >
          {DRIVETRAINS.map((d) => (
            <option key={d.value} value={d.value}>
              {t(d.labelKey)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <input
            type="checkbox"
            name="isNew"
            checked={values.isNew}
            onChange={handleCheckbox}
            className="h-4 w-4 accent-blue-600"
          />
          {t('vehicleForm.isNew')}
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <input
            type="checkbox"
            name="isMPerformance"
            checked={values.isMPerformance}
            onChange={handleCheckbox}
            className="h-4 w-4 accent-blue-600"
          />
          {t('vehicleForm.isMPerformance')}
        </label>
      </div>

      <div>
        <label htmlFor="vehiclePrice" className="text-sm font-medium text-gray-800">
          {t('vehicleForm.basePrice')}
        </label>
        <Input
          id="vehiclePrice"
          name="basePrice"
          type="number"
          min="0"
          step="0.01"
          placeholder={t('vehicleForm.basePriceHint')}
          value={values.basePrice}
          onChange={handleChange}
          className="mt-2 h-11 px-4"
        />
      </div>

      <div>
        <label htmlFor="vehicleImage" className="text-sm font-medium text-gray-800">
          {t('vehicleForm.imageUrl')}
        </label>
        {isEdit && vehicle?.image && !values.imageFile && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">
              {t('vehicleForm.currentImage')}
            </p>
            <img
              src={vehicle.image}
              alt={vehicle.modelName}
              className="mt-1 h-16 w-24 rounded-md border border-input object-cover"
              onError={(e) => {
                e.currentTarget.src = '/images/placeholder-vehicle.svg'
              }}
            />
          </div>
        )}
        <Input
          id="vehicleImage"
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="mt-2 h-11 cursor-pointer px-4"
        />
        {values.imageFile && previewUrl && (
          <div className="mt-3 flex items-center gap-3">
            <img
              src={previewUrl}
              alt="preview"
              className="h-16 w-24 rounded-md border border-input object-cover"
            />
            <span className="text-xs text-muted-foreground">
              {values.imageFile.name}
            </span>
          </div>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">
          {isEdit
            ? t('vehicleForm.imageEditHint')
            : t('vehicleForm.imagePlaceholder')}
        </p>
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}

      <Button type="submit" disabled={submitting} className="h-11 w-full">
        {submitting
          ? t(isEdit ? 'vehicleForm.creating' : 'vehicleForm.creating')
          : t(isEdit ? 'vehicleForm.edit' : 'vehicleForm.create')}
      </Button>
    </form>
  )
}

export default VehicleForm