import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/useAuth'

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

function ProfileBlock() {
  const { t } = useTranslation('admin')
  const { user } = useAuth()

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || ''

  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2">
      {user?.hasProfilePhoto ? (
        <img
          src={`/api/users/${user.id}/photo`}
          alt=""
          className="h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${colorFor(user)}`}
        >
          {initialsFor(user)}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{fullName}</p>
        <p className="truncate text-xs text-gray-400 dark:text-gray-500">
          {user?.isSuperAdmin ? t('profileBlock.superAdmin') : t('profileBlock.admin')}
        </p>
      </div>
    </div>
  )
}

export default ProfileBlock