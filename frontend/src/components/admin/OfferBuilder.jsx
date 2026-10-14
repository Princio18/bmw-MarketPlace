import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Send, Trash2 } from 'lucide-react'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'
import { formatPrice } from '@/lib/price'
import { getErrorMessage } from '@/utils/getErrorMessage'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

const OFFER_STATUS_STYLES = {
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  expired: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  withdrawn: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
}

function OfferStatusBadge({ status, label }) {
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase ${
        OFFER_STATUS_STYLES[status] || OFFER_STATUS_STYLES.expired
      }`}
    >
      {label}
    </span>
  )
}

// Éditeur d'offre admin : ajustements, délai, notes, validité. Le décompte est
// calculé CÔTÉ SERVEUR (offer-preview) ; le front ne fait qu'afficher le retour.
function OfferBuilder({ requestId, requestStatus, offers = [], onChanged }) {
  const { t } = useTranslation('admin')
  const [adjustments, setAdjustments] = useState([])
  const [deliveryMin, setDeliveryMin] = useState('')
  const [deliveryMax, setDeliveryMax] = useState('')
  const [notes, setNotes] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [busyOfferId, setBusyOfferId] = useState(null)

  const locked = requestStatus === 'converted' || requestStatus === 'closed'

  const addAdjustment = () => setAdjustments((prev) => [...prev, { label: '', amount: '' }])
  const updateAdjustment = (index, patch) =>
    setAdjustments((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  const removeAdjustment = (index) =>
    setAdjustments((prev) => prev.filter((_, i) => i !== index))

  const payloadAdjustments = () =>
    adjustments
      .map((item) => ({ label: item.label.trim(), amount: Number(item.amount) }))
      .filter((item) => Number.isFinite(item.amount) && item.amount !== 0)

  const handlePreview = async () => {
    setPreviewing(true)
    setFeedback(null)
    try {
      const { data } = await api.post(
        `/admin/requests/${requestId}/offer-preview`,
        { adjustments: payloadAdjustments() },
        authHeader,
      )
      setPreview(data.pricing)
    } catch (err) {
      const status = err?.response?.status
      setFeedback({
        ok: false,
        text:
          status === 400
            ? t('requests.priceRequired')
            : getErrorMessage(err, t('requests.offerError')),
      })
    } finally {
      setPreviewing(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    setFeedback(null)
    try {
      const { data } = await api.post(
        `/admin/requests/${requestId}/offers`,
        {
          adjustments: payloadAdjustments(),
          deliveryWeeksMin: deliveryMin === '' ? null : Number(deliveryMin),
          deliveryWeeksMax: deliveryMax === '' ? null : Number(deliveryMax),
          notes: notes.trim() || null,
          expiresAt: expiresAt || null,
        },
        authHeader,
      )
      setPreview(null)
      setAdjustments([])
      setNotes('')
      setFeedback({
        ok: true,
        text: data.emailSent ? t('requests.offerCreated') : t('requests.offerCreatedNoEmail'),
      })
      onChanged?.()
    } catch (err) {
      const status = err?.response?.status
      setFeedback({
        ok: false,
        text:
          status === 400
            ? t('requests.priceRequired')
            : getErrorMessage(err, t('requests.offerError')),
      })
    } finally {
      setCreating(false)
    }
  }

  const handleOfferAction = async (offerId, action) => {
    setBusyOfferId(offerId)
    setFeedback(null)
    try {
      await api.post(`/admin/offers/${offerId}/${action}`, {}, authHeader)
      setFeedback({
        ok: true,
        text: action === 'resend' ? t('requests.offerResent') : t('requests.offerWithdrawn'),
      })
      onChanged?.()
    } catch (err) {
      setFeedback({ ok: false, text: getErrorMessage(err, t('requests.offerActionError')) })
    } finally {
      setBusyOfferId(null)
    }
  }

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—'

  return (
    <div className="space-y-3">
      {offers.length > 0 && (
        <ul className="space-y-2">
          {offers.map((offer) => (
            <li
              key={offer.id}
              className="rounded-md border border-zinc-200 p-3 dark:border-gray-700"
            >
              <div className="flex items-center justify-between gap-3">
                <OfferStatusBadge
                  status={offer.status}
                  label={t(`requests.offerStatus${offer.status.charAt(0).toUpperCase()}${offer.status.slice(1)}`)}
                />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatPrice(offer.totalAmount, 'en-GB')}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
                <span>{formatDate(offer.createdAt)}</span>
                <span>{t('requests.offerValidUntil', { date: formatDate(offer.expiresAt) })}</span>
              </div>
              {offer.status === 'active' && (
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleOfferAction(offer.id, 'resend')}
                    disabled={busyOfferId === offer.id}
                    className="text-xs font-semibold text-bmw-blue hover:underline disabled:opacity-50"
                  >
                    {busyOfferId === offer.id ? t('requests.resending') : t('requests.resend')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOfferAction(offer.id, 'withdraw')}
                    disabled={busyOfferId === offer.id}
                    className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                  >
                    {busyOfferId === offer.id ? t('requests.withdrawing') : t('requests.withdraw')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {locked ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('requests.offerFormLocked')}</p>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              {t('requests.adjustments')}
            </label>
            <ul className="space-y-2">
              {adjustments.map((item, index) => (
                <li key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateAdjustment(index, { label: e.target.value })}
                    placeholder={t('requests.adjustmentLabel')}
                    className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-gray-800 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) => updateAdjustment(index, { amount: e.target.value })}
                    placeholder={t('requests.adjustmentAmount')}
                    className="w-28 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-gray-800 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => removeAdjustment(index)}
                    className="text-gray-400 transition hover:text-red-600"
                    aria-label={t('requests.remove')}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={addAdjustment}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-bmw-blue hover:underline"
            >
              <Plus size={14} />
              {t('requests.addAdjustment')}
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              {t('requests.deliveryLabel')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={deliveryMin}
                onChange={(e) => setDeliveryMin(e.target.value)}
                placeholder={t('requests.deliveryMin')}
                className="w-24 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-gray-800 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <span className="text-sm text-gray-400">–</span>
              <input
                type="number"
                min="0"
                value={deliveryMax}
                onChange={(e) => setDeliveryMax(e.target.value)}
                placeholder={t('requests.deliveryMax')}
                className="w-24 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-gray-800 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              {t('requests.offerNotes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={5000}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              {t('requests.validUntil')}
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-gray-800 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          {preview && (
            <div className="rounded-md border border-zinc-200 p-3 dark:border-gray-700">
              <ul className="space-y-1">
                {preview.lines.map((line) => (
                  <li key={line.key} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-gray-600 dark:text-gray-300">{line.label}</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatPrice(line.amount, 'en-GB')}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex items-baseline justify-between border-t border-zinc-200 pt-2 text-sm dark:border-gray-700">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {t('requests.total')}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatPrice(preview.total, 'en-GB')}
                </span>
              </div>
              {preview.warnings?.length > 0 && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  {t('requests.warnings')}: {preview.warnings.join(', ')}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewing || creating}
              className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {previewing ? t('requests.previewing') : t('requests.preview')}
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || previewing}
              className="inline-flex items-center gap-2 rounded bg-bmw-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-bmw-blue/90 disabled:opacity-50"
            >
              <Send size={16} />
              {creating ? t('requests.creating') : t('requests.createOffer')}
            </button>
          </div>
        </>
      )}

      {feedback && (
        <p
          className={`text-sm ${
            feedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {feedback.text}
        </p>
      )}
    </div>
  )
}

export default OfferBuilder
