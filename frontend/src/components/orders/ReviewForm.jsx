import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import api from '../../services/api'
import { getAuthToken } from '../../lib/authToken'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

function StarSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className="cursor-pointer"
        >
          <Star
            size={22}
            className={
              n <= value
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 hover:text-yellow-400 dark:text-gray-600'
            }
          />
        </button>
      ))}
    </div>
  )
}

// Formulaire d'avis partagé entre « My orders » et le suivi de commande.
function ReviewForm({ orderId, vehicleId, onSubmitted }) {
  const { t } = useTranslation()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = rating >= 1 && rating <= 5 && !submitting

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      await api.post(
        '/reviews',
        { vehicleId, orderId, rating, comment: comment.trim() || undefined },
        authHeader,
      )
      onSubmitted()
    } catch {
      setError(t('myOrders.reviewError'))
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-md bg-zinc-50 p-4 dark:bg-gray-800">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        {t('myOrders.leaveReview')}
      </p>
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {t('myOrders.rating')}
        </p>
        <div className="mt-1">
          <StarSelector value={rating} onChange={setRating} />
        </div>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('myOrders.commentPlaceholder')}
        rows={3}
        className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      />
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-3 rounded-md bg-bmw-blue px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#00559a] disabled:opacity-50"
      >
        {submitting ? t('myOrders.submitting') : t('myOrders.submit')}
      </button>
    </form>
  )
}

export default ReviewForm
