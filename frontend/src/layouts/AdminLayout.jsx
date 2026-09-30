import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  CreditCard,
  Car,
  Package,
  FileBarChart2,
  Settings,
  LogOut,
  Sun,
  Moon,
  Search,
} from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import { useTheme } from '@/context/useTheme'
import { AdminSearchProvider } from '@/context/AdminSearchProvider'
import { useAdminSearch } from '@/context/useAdminSearch'
import LanguageSwitcher from '@/components/admin/LanguageSwitcher'
import NotificationBell from '@/components/admin/NotificationBell'
import ProfileBlock from '@/components/admin/ProfileBlock'
import ConfirmModal from '@/components/shared/ConfirmModal'
import bmwLogo from '@/assets/images/bmw-logo.svg'

function Sidebar() {
  const { t } = useTranslation('admin')
  const [logoutOpen, setLogoutOpen] = useState(false)
  const { logout, user, hasPermission } = useAuth()
  const navigate = useNavigate()

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
      isActive
        ? 'bg-bmw-blue/10 font-bold text-bmw-blue dark:bg-bmw-blue/20 dark:text-blue-300'
        : 'font-medium text-gray-600 hover:bg-zinc-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
    }`

  const items = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: t('sidebar.dashboard') },
    {
      to: '/admin/clients',
      icon: Users,
      label: t('sidebar.clients'),
      show: hasPermission('can_manage_clients'),
    },
    {
      to: '/admin/orders',
      icon: ShoppingCart,
      label: t('sidebar.orders'),
      show: hasPermission('can_manage_orders'),
    },
    {
      to: '/admin/payment',
      icon: CreditCard,
      label: t('sidebar.payment'),
      show: hasPermission('can_process_refunds'),
    },
    {
      to: '/admin/vehicles',
      icon: Car,
      label: t('sidebar.vehicles'),
      show: hasPermission('can_manage_vehicles') || hasPermission('can_manage_reviews'),
    },
    {
      to: '/admin/accessories',
      icon: Package,
      label: t('sidebar.accessories'),
      show: hasPermission('can_manage_vehicles'),
    },
    {
      to: '/admin/reports',
      icon: FileBarChart2,
      label: t('sidebar.reports'),
      show: hasPermission('can_view_reports'),
    },
  ].filter((item) => item.show !== false)

  const handleConfirmLogout = () => {
    setLogoutOpen(false)
    logout()
    navigate('/')
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-200 bg-white px-4 py-6 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-2 px-3">
        <img src={bmwLogo} alt="BMW" className="h-8 w-8 shrink-0" />
        <span className="font-manrope text-lg font-bold text-gray-900 dark:text-white">BMW</span>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={linkClass}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="mt-auto space-y-3 border-t border-zinc-200 pt-4 dark:border-gray-700">
          <ProfileBlock />

          <div className="h-px bg-zinc-200 dark:bg-gray-700" />

          <NavLink to="/admin/settings" className={linkClass}>
            <Settings size={18} />
            {t('sidebar.settings')}
          </NavLink>

          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="mt-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-600 dark:text-gray-300 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          >
            <LogOut size={18} />
            {t('sidebar.logout')}
          </button>
        </div>
      )}

      <ConfirmModal
        open={logoutOpen}
        title={t('logout.title')}
        message={t('logout.message')}
        confirmLabel={t('logout.confirm')}
        onConfirm={handleConfirmLogout}
        onCancel={() => setLogoutOpen(false)}
        destructive
      />
    </aside>
  )
}

function Topbar() {
  const { t } = useTranslation('admin')
  const { query, setQuery } = useAdminSearch()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-900">
      <div className="relative w-full max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('topbar.searchPlaceholder')}
          className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-bmw-blue focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={t('topbar.toggleTheme')}
          className="rounded p-2 text-gray-600 transition hover:bg-zinc-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <LanguageSwitcher />
      </div>
    </header>
  )
}

function AdminLayout() {
  return (
    <AdminSearchProvider>
      <div className="flex h-screen bg-zinc-50 dark:bg-gray-950">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminSearchProvider>
  )
}

export default AdminLayout