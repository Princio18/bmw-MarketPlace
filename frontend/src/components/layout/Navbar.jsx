import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  Heart,
  LogOut,
  MapPin,
  Menu,
  Moon,
  ShoppingBag,
  ShoppingCart,
  Sun,
  User,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../context/useTheme'
import { useAuth } from '../../context/useAuth'
import bmwLogo from '../../assets/images/bmw-logo1.png'
import NavDropdown from './NavDropdown'
import { navDropdowns } from '../../data/navDropdowns'

const navLinks = [
  { key: 'models', hasDropdown: false, to: '/all-models' },
  { key: 'electric', hasDropdown: true },
  { key: 'shop', hasDropdown: true },
  { key: 'more', hasDropdown: true },
]

const authIcons = [
  { Icon: ShoppingCart, ariaKey: 'cart', route: '/cart' },
  { Icon: Heart, ariaKey: 'favorites' },
]

const accountBenefitKeys = [
  'account.benefit1',
  'account.benefit2',
  'account.benefit3',
]

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
]

function Navbar() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const { isAuthenticated, logout } = useAuth()
  const resolvedLanguage = i18n.resolvedLanguage || i18n.language
  const [langOpen, setLangOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState(null)
  const langRef = useRef(null)
  const accountRef = useRef(null)

  const toggleMenu = (key) => {
    setOpenMenu((current) => (current === key ? null : key))
  }

  useEffect(() => {
    const onClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    const onClickOutside = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleAuthAction = (route) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (route) {
      navigate(route)
      return
    }
    // TODO: afficher le contenu réel des favoris (prompt séparé)
  }

  const handleLogout = () => {
    logout()
    setAccountOpen(false)
    navigate('/')
  }

  return (
    <nav className="absolute left-0 top-0 z-[1100] w-full border-b border-white/20">
      <div className="flex h-[72px] items-center justify-between px-8">
        <div className="flex h-full items-center gap-8">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault()
              navigate('/')
            }}
            className="inline-flex"
          >
            <img src={bmwLogo} alt="BMW" className="h-10 w-10" />
          </a>
          <ul className="hidden h-full items-center gap-8 text-sm font-semibold text-white md:flex">
            {navLinks.map((link) => {
              const isOpen = openMenu === link.key
              return (
              <li
                key={link.key}
                className="group relative flex h-full items-center"
              >
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setOpenMenu(null)
                    if (link.to) {
                      navigate(link.to)
                      return
                    }
                    if (link.hasDropdown) toggleMenu(link.key)
                  }}
                  aria-expanded={link.hasDropdown ? isOpen : undefined}
                  className="flex items-center gap-1"
                >
                  {t(`nav.${link.key}`)}
                  {link.hasDropdown && (
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </a>
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-0 h-[3px] bg-bmw-blue transition-opacity duration-200 group-hover:opacity-100 ${
                    isOpen ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </li>
              )
            })}
          </ul>
        </div>

        <div className="flex h-full items-center gap-6 text-white">
          <ul className="hidden h-full items-center gap-6 md:flex">
            <li className="group relative flex h-full items-center" ref={accountRef}>
              <button
                type="button"
                aria-label={t('aria.account')}
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((open) => !open)}
                className="cursor-pointer"
              >
                <span className="relative inline-block">
                  <User size={22} />
                  {isAuthenticated && (
                    <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                  )}
                </span>
              </button>
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-[3px] bg-bmw-blue opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
              {accountOpen &&
                (isAuthenticated ? (
                  <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-md bg-white p-2 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false)
                        navigate('/my-orders')
                      }}
                      className="flex w-full items-center gap-3 rounded px-2 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      <ShoppingBag size={16} />
                      {t('common.myOrders')}
                    </button>
                    <div className="my-1 h-px bg-gray-100" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded px-2 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      <LogOut size={16} />
                      {t('common.logout')}
                    </button>
                  </div>
                ) : (
                  <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-md bg-white p-6 shadow-lg">
                  <p className="text-lg font-semibold text-gray-900">
                    {t('account.welcome')}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    {t('account.registerBenefits')}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {accountBenefitKeys.map((key) => (
                      <li key={key} className="flex items-start gap-2">
                        <Check size={16} className="mt-0.5 shrink-0 text-gray-800" />
                        <span className="text-sm text-gray-800">
                          {t(key)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="rounded-sm bg-gray-900 px-6 py-2.5 font-semibold text-white transition hover:bg-black"
                    >
                      {t('common.logIn')}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/register')}
                      className="rounded-sm border border-gray-900 px-6 py-2.5 font-semibold text-gray-900 transition hover:bg-gray-100"
                    >
                      {t('common.register')}
                    </button>
                  </div>
                </div>
              ))}
            </li>

            {authIcons.map(({ Icon, ariaKey, route }) => (
              <li key={ariaKey} className="group relative flex h-full items-center">
                <button
                  type="button"
                  aria-label={t(`aria.${ariaKey}`)}
                  onClick={() => handleAuthAction(route)}
                  className="cursor-pointer"
                >
                  <Icon size={22} />
                </button>
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-[3px] bg-bmw-blue opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                />
              </li>
            ))}

            <li className="group relative flex h-full items-center">
              <button
                type="button"
                aria-label={t('aria.location')}
                onClick={() => navigate('/find-a-bmw-centre')}
                className="cursor-pointer"
              >
                <MapPin size={22} />
              </button>
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-[3px] bg-bmw-blue opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
            </li>

            <li>
              <button
                type="button"
                aria-label={
                  theme === 'light' ? t('aria.darkOff') : t('aria.darkOn')
                }
                onClick={toggleTheme}
                className="cursor-pointer"
              >
                {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
              </button>
            </li>

            <li className="relative" ref={langRef}>
              <button
                type="button"
                aria-label={t('aria.language')}
                aria-expanded={langOpen}
                onClick={() => setLangOpen((open) => !open)}
                className="flex cursor-pointer items-center gap-1 text-sm font-semibold uppercase"
              >
                {resolvedLanguage}
                <ChevronDown size={16} />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full z-30 mt-3 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white py-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                  {languages.map(({ code, label }) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        i18n.changeLanguage(code)
                        setLangOpen(false)
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2 text-sm font-semibold uppercase ${
                        resolvedLanguage === code
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                      }`}
                    >
                      {label}
                      {resolvedLanguage === code && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </li>
          </ul>

          <button
            type="button"
            aria-label={t('aria.menu')}
            className="cursor-pointer md:hidden"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      <NavDropdown
        open={openMenu !== null}
        groups={openMenu ? navDropdowns[openMenu].groups : []}
        onClose={() => setOpenMenu(null)}
      />
    </nav>
  )
}

export default Navbar