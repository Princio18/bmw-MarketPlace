import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { ShoppingCart, UserPlus } from 'lucide-react'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'
import { formatPrice } from '@/lib/price'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

const DRIVETRAIN_COLORS = {
  electric: '#16a34a',
  hybrid: '#0ea5e9',
  petrol: '#f59e0b',
  diesel: '#64748b',
  concept: '#a855f7',
  protection: '#ef4444',
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="font-manrope mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Dashboard() {
  const { t, i18n } = useTranslation('admin')
  const lang = i18n.resolvedLanguage || i18n.language

  const [summary, setSummary] = useState(null)
  const [summaryError, setSummaryError] = useState(false)
  const [months, setMonths] = useState([])
  const [monthsError, setMonthsError] = useState(false)
  const [drivetrains, setDrivetrains] = useState([])
  const [drivetrainsError, setDrivetrainsError] = useState(false)
  const [activity, setActivity] = useState([])
  const [activityError, setActivityError] = useState(false)

  useEffect(() => {
    api
      .get('/admin/dashboard/summary', authHeader)
      .then(({ data }) => setSummary(data))
      .catch(() => setSummaryError(true))

    api
      .get('/admin/dashboard/revenue-by-month', authHeader)
      .then(({ data }) => setMonths(data.months || []))
      .catch(() => setMonthsError(true))

    api
      .get('/admin/dashboard/orders-by-drivetrain', authHeader)
      .then(({ data }) => setDrivetrains(data.rows || []))
      .catch(() => setDrivetrainsError(true))

    api
      .get('/admin/dashboard/recent-activity', authHeader)
      .then(({ data }) => setActivity(data.activity || []))
      .catch(() => setActivityError(true))
  }, [])

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString(lang, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—'

  const drivetrainLabel = (code) =>
    t(`drivetrains.${code}`, { defaultValue: code })

  const kpis = summary
    ? [
        { label: t('dashboard.totalRevenue'), value: formatPrice(summary.totalRevenue, 'en-GB') },
        { label: t('dashboard.revenueThisMonth'), value: formatPrice(summary.revenueThisMonth, 'en-GB') },
        { label: t('dashboard.ordersThisMonth'), value: Number(summary.ordersThisMonth).toLocaleString(lang) },
        { label: t('dashboard.newClientsThisMonth'), value: Number(summary.newClientsThisMonth).toLocaleString(lang) },
        { label: t('dashboard.activeVehicles'), value: Number(summary.activeVehiclesCount).toLocaleString(lang) },
      ]
    : []

  const pieData = drivetrains.map((row) => ({
    name: drivetrainLabel(row.drivetrain),
    value: Number(row.count),
    code: row.drivetrain,
  }))

  return (
    <div className="space-y-6">
      <h1 className="font-manrope text-2xl font-bold text-gray-900 dark:text-white">
        {t('dashboard.title')}
      </h1>

      {summaryError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{t('common.error')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} />
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={t('dashboard.revenue12Months')}>
          {monthsError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{t('common.error')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={months} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-200 dark:text-gray-700" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
                <Tooltip
                  formatter={(value) => formatPrice(Number(value), 'en-GB')}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0066b1"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title={t('dashboard.ordersByDrivetrain')}>
          {drivetrainsError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{t('common.error')}</p>
          ) : pieData.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('dashboard.noData')}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="40%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  label
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.code} fill={DRIVETRAIN_COLORS[entry.code] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      <SectionCard title={t('dashboard.recentActivity')}>
        {activityError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{t('common.error')}</p>
        ) : activity.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('dashboard.noActivity')}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-gray-800">
            {activity.map((item, index) => (
              <li key={index} className="flex items-center gap-3 py-3">
                {item.type === 'order' ? (
                  <span className="rounded bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <ShoppingCart size={16} />
                  </span>
                ) : (
                  <span className="rounded bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    <UserPlus size={16} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {item.type === 'order'
                      ? t('dashboard.activityOrder')
                      : t('dashboard.activityClient')}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                </div>
                <time className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                  {formatDate(item.date)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}

export default Dashboard