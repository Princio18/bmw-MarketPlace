import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'
import { useAdminSearch } from '@/context/useAdminSearch'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

const DEFAULT_PAGE_SIZE = 100

const STATUS_FILTERS = ['all', 'new', 'contacted', 'offer_sent', 'converted', 'closed']

const STATUS_BADGE_STYLES = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  contacted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  offer_sent: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  converted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  closed: 'bg-zinc-200 text-zinc-700 dark:bg-gray-700 dark:text-gray-300',
}

export function RequestStatusBadge({ status }) {
  const { t } = useTranslation('admin')
  const labelKey = `requests.status${status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}`
  return (
    <span
      className={`inline-block rounded-sm px-2 py-0.5 text-xs font-semibold ${
        STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.closed
      }`}
    >
      {t(labelKey, { defaultValue: status })}
    </span>
  )
}

function Requests() {
  const { t, i18n } = useTranslation('admin')
  const lang = i18n.resolvedLanguage || i18n.language
  const { query } = useAdminSearch()

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    api
      .get(`/admin/requests?pageSize=${DEFAULT_PAGE_SIZE}`, authHeader)
      .then(({ data }) => setRequests(data.requests || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const needle = query.trim().toLowerCase()
  const filtered = requests.filter((request) => {
    if (statusFilter !== 'all' && request.status !== statusFilter) return false
    if (!needle) return true
    const name = `${request.firstName || ''} ${request.lastName || ''}`.toLowerCase()
    return request.email.toLowerCase().includes(needle) || name.includes(needle)
  })

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(lang) : '—'

  return (
    <div>
      <h1 className="font-manrope text-2xl font-bold text-gray-900 dark:text-white">
        {t('requests.title')}
      </h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === status
                ? 'bg-bmw-blue text-white'
                : 'bg-zinc-100 text-gray-600 hover:bg-zinc-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {status === 'all' ? t('requests.filterAll') : t(`requests.status${status
              .split('_')
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join('')}`)}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {loading ? (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('requests.loading')}
          </p>
        ) : error ? (
          <p className="py-16 text-center text-sm text-red-600 dark:text-red-400">
            {t('requests.error')}
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('requests.noRequests')}
          </p>
        ) : (
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">{t('requests.ref')}</th>
                <th className="px-5 py-3 font-medium">{t('requests.date')}</th>
                <th className="px-5 py-3 font-medium">{t('requests.client')}</th>
                <th className="px-5 py-3 font-medium">{t('requests.vehicle')}</th>
                <th className="px-5 py-3 font-medium">{t('requests.contact')}</th>
                <th className="px-5 py-3 font-medium">{t('requests.status')}</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-gray-800">
              {filtered.map((request) => {
                const fullName = `${request.firstName || ''} ${request.lastName || ''}`.trim()
                return (
                  <tr key={request.id} className="hover:bg-zinc-50 dark:hover:bg-gray-800/50">
                    <td className="px-5 py-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {request.ref}
                    </td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-200">
                      {formatDate(request.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {fullName || '—'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {request.email}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-200">
                      {request.modelName}
                      {request.variantLabel ? ` — ${request.variantLabel}` : ''}
                    </td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-200">
                      {request.contactPreference === 'phone' && request.phoneNumber
                        ? `${request.phoneCountryCode || ''} ${request.phoneNumber}`.trim()
                        : t('requests.contactEmail')}
                    </td>
                    <td className="px-5 py-4">
                      <RequestStatusBadge status={request.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/admin/requests/${request.id}`}
                        aria-label={t('requests.open')}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-bmw-blue hover:underline"
                      >
                        {t('requests.open')}
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Requests
