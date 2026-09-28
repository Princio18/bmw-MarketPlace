import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'

function relativeTime(value, language) {
  const date = new Date(value)
  const diffMs = date.getTime() - Date.now()
  const rtf = new Intl.RelativeTimeFormat(language === 'fr' ? 'fr' : 'en', {
    numeric: 'auto',
  })
  const abs = Math.abs(diffMs)
  const minutes = Math.round(abs / 60000)
  if (minutes < 1) return rtf.format(0, 'minute')
  if (minutes < 60) return rtf.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 24) return rtf.format(-hours, 'hour')
  const days = Math.round(hours / 24)
  return rtf.format(-days, 'day')
}

function NotificationBell() {
  const { t, i18n } = useTranslation('admin')
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

  const loadRef = useRef()

  const load = async () => {
    try {
      const { data } = await api.get('/admin/notifications?unreadOnly=true', authHeader)
      setNotifications(data.notifications || [])
    } catch {
      /* silencieux : la cloche reste vide en cas d'échec intermittent */
    }
  }

  useEffect(() => {
    loadRef.current = load
    load()
    const interval = setInterval(() => loadRef.current(), 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRead = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      await api.post(`/admin/notifications/${id}/read`, {}, authHeader)
    } catch {
      /* ignore */
    }
  }

  const handleReadAll = async () => {
    setNotifications([])
    try {
      await api.post('/admin/notifications/read-all', {}, authHeader)
    } catch {
      /* ignore */
    }
  }

  const count = notifications.length

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('notifications.label')}
        className="relative rounded p-2 text-gray-600 transition hover:bg-zinc-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('notifications.title')}
              </span>
              {count > 0 && (
                <button
                  type="button"
                  onClick={handleReadAll}
                  className="text-xs font-medium text-bmw-blue hover:underline"
                >
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {count === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {t('notifications.empty')}
                </li>
              ) : (
                notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleRead(n.id)}
                      className="flex w-full flex-col gap-1 border-b border-zinc-100 px-4 py-3 text-left transition hover:bg-zinc-50 dark:border-gray-800 dark:hover:bg-gray-800"
                    >
                      <span className="text-sm text-gray-800 dark:text-gray-100">
                        {n.message}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {relativeTime(n.createdAt, i18n.resolvedLanguage || i18n.language)}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationBell