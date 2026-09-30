import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'
import { getErrorMessage } from '@/utils/getErrorMessage'

const ACCEPTED = 'image/png,image/jpeg,image/webp'

function emptyValues(accessory) {
  return {
    name: accessory?.name ?? '',
    description: accessory?.description ?? '',
    price: accessory?.price ?? '',
    badge: accessory?.badge ?? '',
    requiresAdjustment: Boolean(accessory?.requiresAdjustment),
    stockQuantity: accessory?.stockQuantity ?? 0,
  }
}

function AccessoryForm({ accessory, onSuccess }) {
  const { t } = useTranslation('admin')
  const isEdit = Boolean(accessory)
  const [values, setValues] = useState(() => emptyValues(accessory))
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState('')
  const revokeRef = useRef('')

  useEffect(() => {
    return () => {
      if (revokeRef.current) URL.revokeObjectURL(revokeRef.current)
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
    setImageFile(file)
    if (revokeRef.current) URL.revokeObjectURL(revokeRef.current)
    const next = file ? URL.createObjectURL(file) : ''
    revokeRef.current = next
    setPreviewUrl(next)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const nextErrors = {}
    if (!values.name.trim()) nextErrors.name = t('accessoryForm.nameRequired')
    if (values.price === '' || Number(values.price) < 0) {
      nextErrors.price = t('accessoryForm.priceInvalid')
    }
    if (!Number.isInteger(Number(values.stockQuantity)) || Number(values.stockQuantity) < 0) {
      nextErrors.stockQuantity = t('accessoryForm.stockInvalid')
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || submitting) return

    const payload = new FormData()
    payload.append('name', values.name.trim())
    payload.append('description', values.description.trim())
    payload.append('price', String(values.price))
    payload.append('badge', values.badge.trim())
    payload.append('requiresAdjustment', String(values.requiresAdjustment))
    payload.append('stockQuantity', String(Number(values.stockQuantity)))
    if (imageFile) payload.append('image', imageFile)

    setSubmitting(true)
    setServerError('')
    setSuccess('')
    try {
      await api[isEdit ? 'put' : 'post'](
        isEdit ? `/admin/accessories/${accessory.id}` : '/admin/accessories',
        payload,
        { headers: { Authorization: `Bearer ${getAuthToken()}` } },
      )
      setSuccess(t(isEdit ? 'accessoryForm.updated' : 'accessoryForm.created'))
      if (!isEdit) {
        setValues(emptyValues())
        setImageFile(null)
        setPreviewUrl('')
      }
      onSuccess?.()
    } catch (err) {
      setServerError(getErrorMessage(err, t('accessoryForm.genericError')))
    } finally {
      setSubmitting(false)
    }
  }

  const selectClass =
    'mt-2 h-11 w-full rounded-md border border-input bg-transparent px-3 text-base text-gray-900 shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm'

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="accName" className="text-sm font-medium text-gray-800">
          {t('accessoryForm.name')}*
        </label>
        <Input
          id="accName"
          name="name"
          type="text"
          autoComplete="off"
          value={values.name}
          onChange={handleChange}
          aria-invalid={Boolean(errors.name)}
          className="mt-2 h-11 px-4"
        />
        {errors.name && (
          <p className="mt-1.5 text-xs text-destructive">{errors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="accDescription" className="text-sm font-medium text-gray-800">
          {t('accessoryForm.description')}
        </label>
        <textarea
          id="accDescription"
          name="description"
          rows={4}
          value={values.description}
          onChange={handleChange}
          className={selectClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="accPrice" className="text-sm font-medium text-gray-800">
            {t('accessoryForm.price')}*
          </label>
          <Input
            id="accPrice"
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={values.price}
            onChange={handleChange}
            aria-invalid={Boolean(errors.price)}
            className="mt-2 h-11 px-4"
          />
          {errors.price && (
            <p className="mt-1.5 text-xs text-destructive">{errors.price}</p>
          )}
        </div>

        <div>
          <label htmlFor="accStock" className="text-sm font-medium text-gray-800">
            {t('accessoryForm.stockQuantity')}*
          </label>
          <Input
            id="accStock"
            name="stockQuantity"
            type="number"
            min="0"
            step="1"
            value={values.stockQuantity}
            onChange={handleChange}
            aria-invalid={Boolean(errors.stockQuantity)}
            className="mt-2 h-11 px-4"
          />
          {errors.stockQuantity && (
            <p className="mt-1.5 text-xs text-destructive">{errors.stockQuantity}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="accBadge" className="text-sm font-medium text-gray-800">
            {t('accessoryForm.badge')}
          </label>
          <Input
            id="accBadge"
            name="badge"
            type="text"
            autoComplete="off"
            placeholder={t('accessoryForm.badgePlaceholder')}
            value={values.badge}
            onChange={handleChange}
            className="mt-2 h-11 px-4"
          />
        </div>

        <label className="flex items-end gap-2 pb-2 text-sm font-medium text-gray-800">
          <input
            type="checkbox"
            name="requiresAdjustment"
            checked={values.requiresAdjustment}
            onChange={handleCheckbox}
            className="h-4 w-4 accent-blue-600"
          />
          {t('accessoryForm.requiresAdjustment')}
        </label>
      </div>

      <div>
        <label htmlFor="accImage" className="text-sm font-medium text-gray-800">
          {t('accessoryForm.image')}
        </label>
        {isEdit && accessory?.image && !previewUrl && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">
              {t('accessoryForm.currentImage')}
            </p>
            <img
              src={accessory.image}
              alt={accessory.name}
              onError={(e) => {
                e.currentTarget.src = '/images/placeholder-accessory.svg'
              }}
              className="mt-1 h-16 w-24 rounded-md border border-input bg-white object-contain"
            />
          </div>
        )}
        <Input
          id="accImage"
          name="image"
          type="file"
          accept={ACCEPTED}
          onChange={handleFileChange}
          className="mt-2 h-11 cursor-pointer px-4"
        />
        {imageFile && previewUrl && (
          <div className="mt-3 flex items-center gap-3">
            <img
              src={previewUrl}
              alt="preview"
              className="h-16 w-24 rounded-md border border-input object-cover"
            />
            <span className="text-xs text-muted-foreground">{imageFile.name}</span>
          </div>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">
          {isEdit ? t('accessoryForm.imageEditHint') : t('accessoryForm.imagePlaceholder')}
        </p>
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}

      <Button type="submit" disabled={submitting} className="h-11 w-full">
        {submitting ? t('common.saving') : t(isEdit ? 'accessoryForm.edit' : 'accessoryForm.create')}
      </Button>
    </form>
  )
}

export default AccessoryForm
