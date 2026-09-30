import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'
import { useAuth } from '@/context/useAuth'
import CreateAdminForm from '@/components/admin/CreateAdminForm'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { getErrorMessage } from '@/utils/getErrorMessage'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

const PERMISSION_KEYS = [
  'can_manage_vehicles',
  'can_manage_orders',
  'can_process_refunds',
  'can_manage_reviews',
  'can_view_reports',
  'can_manage_clients',
]

const PERMISSION_LABELS = {
  can_manage_vehicles: 'permissions.can_manage_vehicles',
  can_manage_orders: 'permissions.can_manage_orders',
  can_process_refunds: 'permissions.can_process_refunds',
  can_manage_reviews: 'permissions.can_manage_reviews',
  can_view_reports: 'permissions.can_view_reports',
  can_manage_clients: 'permissions.can_manage_clients',
}

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-indigo-600',
  'bg-sky-600',
  'bg-teal-600',
  'bg-violet-600',
  'bg-rose-600',
]

function initialsFor(user) {
  if (user?.firstName && user?.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  }
  if (user?.firstName) return user.firstName[0].toUpperCase()
  if (user?.lastName) return user.lastName[0].toUpperCase()
  return (user?.email || '?')[0].toUpperCase()
}

function colorFor(user) {
  let hash = 0
  const base = user?.id || user?.email || ''
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function ChangePasswordForm() {
  const { t } = useTranslation('admin')
  const [values, setValues] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextErrors = {}
    if (!values.current) nextErrors.current = t('settings.currentRequired')
    if (!values.next) nextErrors.next = t('settings.newRequired')
    if (!values.confirm) nextErrors.confirm = t('settings.confirmRequired')
    else if (values.next !== values.confirm) nextErrors.confirm = t('settings.passwordMismatch')

    setErrors(nextErrors)
    setMessage(null)
    if (Object.keys(nextErrors).length > 0 || submitting) return

    setSubmitting(true)
    try {
      await api.put(
        '/auth/change-password',
        { currentPassword: values.current, newPassword: values.next },
        authHeader,
      )
      setValues({ current: '', next: '', confirm: '' })
      setMessage({ ok: true, text: t('settings.passwordUpdated') })
    } catch (err) {
      setMessage({ ok: false, text: getErrorMessage(err, t('settings.passwordError')) })
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-4 text-sm text-gray-900 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white'

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="currentPassword" className="text-sm font-medium text-gray-800 dark:text-gray-100">
          {t('settings.currentPassword')}
        </label>
        <input
          id="currentPassword"
          name="current"
          type="password"
          autoComplete="current-password"
          value={values.current}
          onChange={handleChange}
          className={inputClass}
        />
        {errors.current && <p className="mt-1.5 text-xs text-red-600">{errors.current}</p>}
      </div>

      <div>
        <label htmlFor="newPassword" className="text-sm font-medium text-gray-800 dark:text-gray-100">
          {t('settings.newPassword')}
        </label>
        <input
          id="newPassword"
          name="next"
          type="password"
          autoComplete="new-password"
          value={values.next}
          onChange={handleChange}
          className={inputClass}
        />
        {errors.next && <p className="mt-1.5 text-xs text-red-600">{errors.next}</p>}
      </div>

      <div>
        <label htmlFor="confirmNewPassword" className="text-sm font-medium text-gray-800 dark:text-gray-100">
          {t('settings.confirmPassword')}
        </label>
        <input
          id="confirmNewPassword"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={values.confirm}
          onChange={handleChange}
          className={inputClass}
        />
        {errors.confirm && <p className="mt-1.5 text-xs text-red-600">{errors.confirm}</p>}
      </div>

      {message && (
        <p className={`text-sm ${message.ok ? 'text-emerald-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="h-11 rounded bg-bmw-blue px-6 text-sm font-semibold text-white transition hover:bg-[#00559a] disabled:opacity-50"
      >
        {submitting ? t('common.loading') : t('settings.updatePassword')}
      </button>
    </form>
  )
}

function ProfileTab() {
  const { t } = useTranslation('admin')
  const { user, refreshUser } = useAuth()
  const fileRef = useRef(null)
  const [photoVersion, setPhotoVersion] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '—'
  const showPhoto = Boolean(user?.hasProfilePhoto || photoVersion > 0)

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      await api.put('/auth/profile-photo', formData, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      setPhotoVersion((v) => v + 1)
      setMessage({ ok: true, text: t('settings.photoUpdated') })
      refreshUser()
    } catch {
      setMessage({ ok: false, text: t('settings.photoError') })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-5 text-base font-semibold text-gray-900 dark:text-white">
          {t('settings.profileTitle')}
        </h2>

        <div className="mb-6 flex items-center gap-4">
          {showPhoto ? (
            <img
              src={`/api/users/${user.id}/photo?v=${photoVersion}`}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${colorFor(user)}`}
            >
              {initialsFor(user)}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              id="profilePhoto"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <label
              htmlFor="profilePhoto"
              className="inline-flex cursor-pointer items-center rounded-md bg-bmw-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00559a] disabled:opacity-50"
            >
              {uploading ? t('common.loading') : t('settings.uploadPhoto')}
            </label>
          </div>
        </div>

        {message && (
          <p className={`mb-4 text-sm ${message.ok ? 'text-emerald-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {t('settings.fullName')}
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{fullName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {t('settings.email')}
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{user?.email || '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {t('settings.role')}
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
              {user?.isSuperAdmin ? t('team.superAdmin') : t('team.admin')}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-5 text-base font-semibold text-gray-900 dark:text-white">
          {t('settings.changePassword')}
        </h2>
        <ChangePasswordForm />
      </section>
    </div>
  )
}

function PermissionCheckboxes({ row, onChange }) {
  const { t } = useTranslation('admin')
  const disabled = row.isSuperAdmin
  return (
    <div className="flex flex-wrap items-center gap-4">
      {PERMISSION_KEYS.map((key) => (
        <label
          key={key}
          className={`flex items-center gap-1.5 text-xs ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        >
          <input
            type="checkbox"
            checked={disabled ? true : Boolean(row[key])}
            disabled={disabled}
            onChange={(e) => onChange(key, e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-bmw-blue focus:ring-bmw-blue"
          />
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {t(PERMISSION_LABELS[key])}
          </span>
        </label>
      ))}
    </div>
  )
}

function TeamTab() {
  const { t } = useTranslation('admin')
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [promoteTarget, setPromoteTarget] = useState(null)

  const load = async () => {
    try {
      const { data } = await api.get('/admin/team', authHeader)
      setTeam(data.team || [])
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    api
      .get('/admin/team', authHeader)
      .then(({ data }) => {
        if (!cancelled) {
          setTeam(data.team || [])
          setError(false)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handlePermission = async (memberId, key, checked) => {
    const member = team.find((m) => m.id === memberId)
    if (!member || member.isSuperAdmin) return
    const next = { ...member, [key]: checked }
    setTeam((prev) => prev.map((m) => (m.id === memberId ? next : m)))
    try {
      const body = {}
      for (const col of PERMISSION_KEYS) body[col] = Boolean(next[col])
      await api.put(`/admin/team/${memberId}/permissions`, body, authHeader)
    } catch {
      load()
    }
  }

  const handlePromote = async () => {
    if (!promoteTarget) return
    try {
      await api.put(`/admin/team/${promoteTarget.id}/promote`, {}, authHeader)
      setPromoteTarget(null)
      load()
    } catch {
      setError(true)
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.loading')}</p>
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{t('common.error')}</p>
  }

  return (
    <div className="grid max-w-5xl gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-5 text-base font-semibold text-gray-900 dark:text-white">
          {t('team.title')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">{t('team.photo')}</th>
                <th className="px-4 py-3 font-medium">{t('team.name')}</th>
                <th className="px-4 py-3 font-medium">{t('team.email')}</th>
                <th className="px-4 py-3 font-medium">{t('team.role')}</th>
                <th className="px-4 py-3 font-medium">{t('team.permissions')}</th>
                <th className="px-4 py-3 font-medium">{t('team.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-gray-800">
              {team.map((member) => (
                <tr key={member.id} className="align-top">
                  <td className="px-4 py-3.5">
                    {member.hasProfilePhoto ? (
                      <img
                        src={`/api/users/${member.id}/photo`}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${colorFor(member)}`}
                      >
                        {initialsFor(member)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-white">
                    {[member.firstName, member.lastName].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-4 py-3.5 text-gray-700 dark:text-gray-200">{member.email}</td>
                  <td className="px-4 py-3.5">
                    {member.isSuperAdmin ? (
                      <span className="inline-block rounded-sm bg-bmw-blue/10 px-2 py-0.5 text-xs font-semibold text-bmw-blue dark:bg-bmw-blue/20 dark:text-blue-300">
                        {t('team.superAdmin')}
                      </span>
                    ) : (
                      <span className="inline-block rounded-sm bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {t('team.admin')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <PermissionCheckboxes row={member} onChange={(k, v) => handlePermission(member.id, k, v)} />
                  </td>
                  <td className="px-4 py-3.5">
                    {!member.isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => setPromoteTarget(member)}
                        className="rounded-md border border-bmw-blue px-3 py-1.5 text-xs font-semibold text-bmw-blue transition hover:bg-bmw-blue hover:text-white"
                      >
                        {t('team.promote')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-5 text-base font-semibold text-gray-900 dark:text-white">
          {t('settings.createAdmin')}
        </h2>
        <CreateAdminForm />
      </section>

      <ConfirmModal
        open={Boolean(promoteTarget)}
        title={t('team.promoteTitle')}
        message={t('team.promoteMessage', { name: promoteTarget?.email || '' })}
        confirmLabel={t('team.promoteConfirm')}
        onConfirm={handlePromote}
        onCancel={() => setPromoteTarget(null)}
      />
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-bmw-blue text-white'
          : 'text-gray-700 hover:bg-zinc-100 dark:text-gray-200 dark:hover:bg-gray-800'
      }`}
    >
      {children}
    </button>
  )
}

function Settings() {
  const { t } = useTranslation('admin')
  const { user } = useAuth()
  const isSuperAdmin = user?.isSuperAdmin === true
  const [tab, setTab] = useState('profile')

  return (
    <div>
      <h1 className="font-manrope text-2xl font-bold text-gray-900 dark:text-white">
        {t('settings.title')}
      </h1>

      <div className="mt-6 flex gap-2">
        <TabButton active={tab === 'profile'} onClick={() => setTab('profile')}>
          {t('settings.profileTab')}
        </TabButton>
        {isSuperAdmin && (
          <TabButton active={tab === 'team'} onClick={() => setTab('team')}>
            {t('settings.teamTab')}
          </TabButton>
        )}
      </div>

      {tab === 'team' && isSuperAdmin ? <TeamTab /> : <ProfileTab />}
    </div>
  )
}

export default Settings