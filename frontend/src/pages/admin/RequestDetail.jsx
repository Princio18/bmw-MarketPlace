import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Mail, Send } from 'lucide-react'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'
import { formatPrice } from '@/lib/price'
import { resolveConfiguration } from '@/utils/resolveConfiguration'
import { getErrorMessage } from '@/utils/getErrorMessage'
import OfferBuilder from '@/components/admin/OfferBuilder'
import { RequestStatusBadge } from './Requests'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

const MANUAL_STATUSES = ['new', 'contacted', 'closed']
const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="%23e5e7eb"/></svg>'

const MESSAGE_STATUS_STYLES = {
  sent: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

function Field({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="shrink-0 text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right font-medium text-gray-900 dark:text-white">{value ?? '—'}</dd>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="space-y-3 p-5">{children}</div>
    </div>
  )
}

function RequestDetail() {
  const { t, i18n } = useTranslation('admin')
  const lang = i18n.resolvedLanguage || i18n.language
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [status, setStatus] = useState('new')
  const [statusSaving, setStatusSaving] = useState(false)

  const [notes, setNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  const [templateId, setTemplateId] = useState('acknowledgement')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendFeedback, setSendFeedback] = useState(null)

  const load = useCallback(async () => {
    try {
      const { data: payload } = await api.get(`/admin/requests/${id}`, authHeader)
      setData(payload)
      setStatus(payload.request.status)
      setNotes(payload.request.adminNotes || '')
      return payload
    } catch {
      setError(true)
      return null
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const request = data?.request
  const vehicle = data?.vehicle

  const firstName = request?.firstName || t('requests.dearClient')
  const modelName = vehicle?.modelName || t('requests.yourBmw')

  const templates = useMemo(
    () => [
      {
        id: 'acknowledgement',
        subject: t('requests.templateAckSubject', { modelName }),
        body: t('requests.templateAckBody', { firstName, modelName }),
      },
      {
        id: 'details',
        subject: t('requests.templateDetailsSubject', { modelName }),
        body: t('requests.templateDetailsBody', { firstName, modelName }),
      },
      {
        id: 'offer',
        subject: t('requests.templateOfferSubject', { modelName }),
        body: t('requests.templateOfferBody', { firstName, modelName }),
      },
    ],
    [t, firstName, modelName],
  )

  // Pré-remplit le composeur avec le 1er modèle dès que la demande est chargée
  // et que l'admin n'a pas encore commencé à écrire.
  useEffect(() => {
    if (!data) return
    setSubject((current) => current || templates[0].subject)
    setBody((current) => current || templates[0].body)
  }, [data, templates])

  const configuration = useMemo(() => {
    if (!request || !vehicle)
      return { rows: [], accessories: [], optionalEquipment: [], estimatedTotal: 0 }
    return resolveConfiguration(request.configurationData, vehicle.specs, data.accessories, {
      basePrice: vehicle.basePrice,
      translate: (key, fallback) => t(`requests.${key}`, { defaultValue: fallback }),
    })
  }, [request, vehicle, data, t])

  const applyTemplate = (nextId) => {
    setTemplateId(nextId)
    const template = templates.find((item) => item.id === nextId)
    if (template) {
      setSubject(template.subject)
      setBody(template.body)
    }
  }

  const handleStatusChange = async (nextStatus) => {
    const previous = status
    setStatus(nextStatus)
    setStatusSaving(true)
    try {
      await api.put(`/admin/requests/${id}/status`, { status: nextStatus }, authHeader)
    } catch (err) {
      setStatus(previous)
      setSendFeedback({ ok: false, text: getErrorMessage(err, t('common.error')) })
    } finally {
      setStatusSaving(false)
    }
  }

  const handleSaveNotes = async () => {
    setNotesSaving(true)
    setNotesSaved(false)
    try {
      await api.put(`/admin/requests/${id}/notes`, { adminNotes: notes }, authHeader)
      setNotesSaved(true)
    } catch (err) {
      setSendFeedback({ ok: false, text: getErrorMessage(err, t('common.error')) })
    } finally {
      setNotesSaving(false)
    }
  }

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setSendFeedback({ ok: false, text: t('requests.composeRequired') })
      return
    }
    setSending(true)
    setSendFeedback(null)
    try {
      await api.post(`/admin/requests/${id}/messages`, { subject, body }, authHeader)
      setSendFeedback({ ok: true, text: t('requests.messageSent') })
      await load()
    } catch (err) {
      setSendFeedback({ ok: false, text: getErrorMessage(err, t('requests.messageError')) })
      await load()
    } finally {
      setSending(false)
    }
  }

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleString(lang, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—'

  if (loading) {
    return (
      <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
        {t('requests.loading')}
      </p>
    )
  }

  if (error || !request) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600 dark:text-red-400">{t('requests.error')}</p>
        <button
          type="button"
          onClick={() => navigate('/admin/requests')}
          className="text-sm font-semibold text-bmw-blue hover:underline"
        >
          {t('requests.back')}
        </button>
      </div>
    )
  }

  const isAutomaticStatus = !MANUAL_STATUSES.includes(request.status)
  const fullName =
    [request.salutation, request.firstName, request.lastName].filter(Boolean).join(' ') || '—'
  const phone =
    request.contactPreference === 'phone' && request.phoneNumber
      ? `${request.phoneCountryCode || ''} ${request.phoneNumber}`.trim()
      : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/admin/requests"
            className="inline-flex items-center gap-1 text-xs font-semibold text-bmw-blue hover:underline"
          >
            <ArrowLeft size={14} />
            {t('requests.back')}
          </Link>
          <h1 className="font-manrope mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {t('requests.detailTitle', { ref: request.ref })}
          </h1>
        </div>
        <RequestStatusBadge status={request.status} />
      </div>

      {sendFeedback && (
        <p
          className={`rounded-md border px-4 py-2 text-sm ${
            sendFeedback.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
          }`}
        >
          {sendFeedback.text}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title={t('requests.clientSection')}>
            <dl className="space-y-2">
              <Field label={t('requests.name')} value={fullName} />
              <Field label={t('requests.email')} value={request.email} />
              <Field
                label={t('requests.contactPreference')}
                value={
                  request.contactPreference === 'phone'
                    ? t('requests.contactPhone')
                    : t('requests.contactEmail')
                }
              />
              {phone && <Field label={t('requests.phone')} value={phone} />}
              {request.detailsConfirmedAt && (
                <Field
                  label={t('requests.detailsConfirmed')}
                  value={formatDate(request.detailsConfirmedAt)}
                />
              )}
              <Field label={t('requests.receivedAt')} value={formatDate(request.createdAt)} />
            </dl>
          </SectionCard>

          <SectionCard title={t('requests.vehicleSection')}>
            <img
              src={vehicle?.image || FALLBACK_IMAGE}
              alt={vehicle?.modelName || ''}
              className="h-40 w-full rounded-md object-cover"
            />
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium text-gray-900 dark:text-white">
                {vehicle?.modelName}
                {vehicle?.variantLabel ? ` — ${vehicle.variantLabel}` : ''}
              </span>
              {vehicle?.basePrice != null && (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {formatPrice(vehicle.basePrice, 'en-GB')}
                </span>
              )}
            </div>
          </SectionCard>

          <SectionCard title={t('requests.configSection')}>
            {configuration.rows.length === 0 &&
            configuration.accessories.length === 0 &&
            configuration.optionalEquipment.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('requests.configNone')}
              </p>
            ) : (
              <>
                <dl className="space-y-2">
                  {configuration.rows.map((row) => (
                    <Field
                      key={row.key}
                      label={row.label}
                      value={
                        <>
                          {row.value}
                          {row.hint && (
                            <span className="ml-1 font-normal text-gray-400">{row.hint}</span>
                          )}
                        </>
                      }
                    />
                  ))}
                </dl>
                {configuration.optionalEquipment.length > 0 && (
                  <div className="border-t border-zinc-200 pt-3 dark:border-gray-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('requests.configOptionalEquipment')}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {configuration.optionalEquipment.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-baseline justify-between gap-3 text-sm"
                        >
                          <span className="text-gray-600 dark:text-gray-300">{item.name}</span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {item.price == null
                              ? t('requests.configUnavailable')
                              : formatPrice(item.price, 'en-GB')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {configuration.accessories.length > 0 && (
                  <div className="border-t border-zinc-200 pt-3 dark:border-gray-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('requests.configAccessories')}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {configuration.accessories.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-baseline justify-between gap-3 text-sm"
                        >
                          <span className="text-gray-600 dark:text-gray-300">{item.name}</span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {item.price == null
                              ? t('requests.configUnavailable')
                              : formatPrice(item.price, 'en-GB')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-zinc-200 pt-3 text-sm dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {t('requests.estimatedTotal')}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatPrice(configuration.estimatedTotal, 'en-GB')}
                  </span>
                </div>
              </>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title={t('requests.statusSection')}>
            {isAutomaticStatus ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('requests.statusAutomatic')}
              </p>
            ) : (
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={statusSaving}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                {MANUAL_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {t(`requests.status${value.charAt(0).toUpperCase()}${value.slice(1)}`)}
                  </option>
                ))}
              </select>
            )}

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                {t('requests.notes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value)
                  setNotesSaved(false)
                }}
                rows={4}
                placeholder={t('requests.notesPlaceholder')}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={notesSaving}
                  className="rounded bg-bmw-blue px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-bmw-blue/90 disabled:opacity-50"
                >
                  {notesSaving ? t('common.saving') : t('requests.saveNotes')}
                </button>
                {notesSaved && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    {t('requests.notesSaved')}
                  </span>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t('requests.messageSection')}>
            <select
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {t(`requests.templateName${template.id.charAt(0).toUpperCase()}${template.id.slice(1)}`)}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={150}
              placeholder={t('requests.subject')}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              rows={8}
              placeholder={t('requests.body')}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded bg-bmw-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-bmw-blue/90 disabled:opacity-50"
            >
              <Send size={16} />
              {sending ? t('requests.sending') : t('requests.send')}
            </button>
          </SectionCard>

          <SectionCard title={t('requests.historySection')}>
            {data.messages.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('requests.noMessages')}
              </p>
            ) : (
              <ul className="space-y-3">
                {data.messages.map((message) => (
                  <li
                    key={message.id}
                    className="rounded-md border border-zinc-200 p-3 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
                        <Mail size={13} />
                        {message.subject}
                      </span>
                      <span
                        className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          MESSAGE_STATUS_STYLES[message.deliveryStatus] ||
                          MESSAGE_STATUS_STYLES.sent
                        }`}
                      >
                        {message.deliveryStatus}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-xs text-gray-600 dark:text-gray-300">
                      {message.body}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
                      <span>
                        {message.isAutomatic
                          ? t('requests.automatic')
                          : t('requests.manual')}
                      </span>
                      <span>{formatDate(message.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title={t('requests.offersSection')}>
            <OfferBuilder
              requestId={id}
              requestStatus={request.status}
              offers={data.offers}
              onChanged={load}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

export default RequestDetail
