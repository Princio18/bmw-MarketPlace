import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'
import AccessoryForm from '@/components/admin/AccessoryForm'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

function AccessoryFormPage() {
  const { t } = useTranslation('admin')
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = Boolean(id)

  const [accessory, setAccessory] = useState(null)
  const [loading, setLoading] = useState(isEditMode)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    api
      .get(`/admin/accessories/${id}`, authHeader)
      .then(({ data }) => setAccessory(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={() => navigate('/admin/accessories')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
      >
        <ChevronLeft size={16} />
        {t('accessoryFormPage.back')}
      </button>

      <h1 className="font-manrope mt-4 text-2xl font-bold text-gray-900 dark:text-white">
        {t(isEditMode ? 'accessoryFormPage.editTitle' : 'accessoryFormPage.newTitle')}
      </h1>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {loading ? (
          <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('common.loading')}
          </p>
        ) : error ? (
          <p className="py-10 text-center text-sm text-red-600 dark:text-red-400">
            {t('common.error')}
          </p>
        ) : (
          <AccessoryForm
            accessory={accessory}
            onSuccess={() => {
              if (!isEditMode) navigate('/admin/accessories')
            }}
          />
        )}
      </div>
    </div>
  )
}

export default AccessoryFormPage
