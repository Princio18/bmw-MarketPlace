import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'
import { getErrorMessage } from '@/utils/getErrorMessage'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

// Graphe des transitions permis, identique au backend. Un saut d'étape ou un
// retour arrière n'y figure pas : le serveur les refuserait de toute façon.
const ALLOWED_TRANSITIONS = {
  pending: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/

function OrderStatusModal({ order, onClose, onUpdated }) {
  const { t } = useTranslation('admin')

  const current = order.processingStatus || 'pending'
  const options = ALLOWED_TRANSITIONS[current] || []

  const [target, setTarget] = useState(options[0] || '')
  const [vin, setVin] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const requiresVin = target === 'ready'
  const isCancel = target === 'cancelled'

  const vinValid = !requiresVin || VIN_REGEX.test(vin.trim().toUpperCase())
  const scheduledValid = !requiresVin || Boolean(scheduledAt)
  const canSubmit = Boolean(target) && vinValid && scheduledValid && !saving

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    setError('')
    try {
      const payload = { processingStatus: target }
      if (requiresVin) {
        payload.vin = vin.trim().toUpperCase()
        payload.scheduledHandoverAt = new Date(scheduledAt).toISOString()
      }
      if (note.trim()) payload.note = note.trim()
      await api.put(`/admin/orders/${order.id}/status`, payload, authHeader)
      onUpdated(target)
    } catch (err) {
      setError(getErrorMessage(err, t('orders.statusModal.error')))
      setSaving(false)
    }
  }

  const label = (status) =>
    t(`orders.processing${status.charAt(0).toUpperCase()}${status.slice(1)}`)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('orders.statusModal.title')}
        className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('orders.statusModal.title')}
        </h2>

        {options.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            {t('orders.statusModal.noTransitions')}
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('orders.statusModal.currentLabel')}
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {label(current)}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('orders.statusModal.newLabel')}
              </label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                {options.map((status) => (
                  <option key={status} value={status}>
                    {label(status)}
                  </option>
                ))}
              </select>
            </div>

            {requiresVin && (
              <>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('orders.statusModal.vinLabel')}
                  </label>
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => setVin(e.target.value)}
                    maxLength={17}
                    className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-sm uppercase text-gray-800 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('orders.statusModal.vinHint')}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('orders.statusModal.handoverAtLabel')}
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
              </>
            )}

            {isCancel && (
              <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                {t('orders.statusModal.cancelWarning')}
              </p>
            )}

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('orders.statusModal.noteLabel')}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-zinc-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {options.length === 0 ? t('orders.close') : t('orders.statusModal.cancel')}
          </button>
          {options.length > 0 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`rounded px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
                isCancel ? 'bg-red-600 hover:bg-red-700' : 'bg-bmw-blue hover:bg-[#00559a]'
              }`}
            >
              {saving ? t('orders.statusModal.saving') : t('orders.statusModal.confirm')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrderStatusModal
