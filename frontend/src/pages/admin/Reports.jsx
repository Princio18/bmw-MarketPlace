import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

function Reports() {
  const { t } = useTranslation('admin')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const download = async (url, key) => {
    setError('')
    setBusy(key)
    try {
      const res = await api.get(url, { ...authHeader, responseType: 'blob' })
      const disposition = res.headers['content-disposition'] || ''
      const match = /filename="([^"]+)"/.exec(disposition)
      const filename = match ? match[1] : 'report'
      const blobUrl = URL.createObjectURL(res.data)
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    } catch {
      setError(t('reports.error'))
    } finally {
      setBusy('')
    }
  }

  const downloadOrders = () => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const query = params.toString()
    download(`/admin/reports/orders${query ? `?${query}` : ''}`, 'orders')
  }

  const blockClass =
    'rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900'

  return (
    <div>
      <h1 className="font-manrope text-2xl font-bold text-gray-900 dark:text-white">
        {t('reports.title')}
      </h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className={blockClass}>
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={22} className="text-bmw-blue" />
            <h2 className="font-manrope text-lg font-semibold text-gray-900 dark:text-white">
              {t('reports.ordersTitle')}
            </h2>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {t('reports.ordersDescription')}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
              {t('reports.from')}
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
              {t('reports.to')}
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={downloadOrders}
            disabled={busy === 'orders'}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-bmw-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00559a] disabled:opacity-60"
          >
            <Download size={16} />
            {busy === 'orders' ? t('common.loading') : t('reports.downloadOrders')}
          </button>
        </section>

        <section className={blockClass}>
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={22} className="text-bmw-blue" />
            <h2 className="font-manrope text-lg font-semibold text-gray-900 dark:text-white">
              {t('reports.vehiclesTitle')}
            </h2>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {t('reports.vehiclesDescription')}
          </p>
          <button
            type="button"
            onClick={() => download('/admin/reports/vehicles', 'vehicles')}
            disabled={busy === 'vehicles'}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-bmw-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00559a] disabled:opacity-60"
          >
            <Download size={16} />
            {busy === 'vehicles' ? t('common.loading') : t('reports.downloadVehicles')}
          </button>
        </section>

        <section className={blockClass}>
          <div className="flex items-center gap-3">
            <FileText size={22} className="text-bmw-blue" />
            <h2 className="font-manrope text-lg font-semibold text-gray-900 dark:text-white">
              {t('reports.revenueTitle')}
            </h2>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {t('reports.revenueDescription')}
          </p>
          <button
            type="button"
            onClick={() => download('/admin/reports/revenue', 'revenue')}
            disabled={busy === 'revenue'}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-bmw-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00559a] disabled:opacity-60"
          >
            <Download size={16} />
            {busy === 'revenue' ? t('common.loading') : t('reports.downloadRevenue')}
          </button>
        </section>
      </div>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export default Reports