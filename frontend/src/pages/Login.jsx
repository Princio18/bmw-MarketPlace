import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useAuth } from '../context/useAuth'
import { getDeviceId } from '../utils/deviceId'
import { getErrorMessage } from '../utils/getErrorMessage'

const images = [
  '/images/login/login-photo0.webp',
  '/images/login/login-photo1.webp',
  '/images/login/login-photo2.webp',
  '/images/login/login-photo3.webp',
  '/images/login/login-photo4.webp',
]

function LoginSlideshow() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(
      () => setIndex((i) => (i + 1) % images.length),
      4000,
    )
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative z-0 h-full w-full">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute inset-x-[10px] inset-y-[10px] rounded-md object-cover transition-opacity duration-1000 ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
    </div>
  )
}

function Login() {
  const [settled, setSettled] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const { login } = useAuth()
  const from = location.state?.from
  // Bandeau d'information distinct de l'erreur de mot de passe : affiché
  // dans les deux étapes du formulaire, jamais en rouge.
  const sessionExpired = searchParams.get('reason') === 'session_expired'

  const [step, setStep] = useState('identifier') // 'identifier' | 'password'
  const [bmwId, setBmwId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [keepLoggedIn, setKeepLoggedIn] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => setSettled(true), 2000)
    return () => clearTimeout(timeout)
  }, [])

  const handleContinue = (e) => {
    e.preventDefault()
    if (bmwId.trim() === '') {
      setError(t('pages.login.errors.enterBmwId'))
      return
    }
    setError('')
    setStep('password')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/auth/login', {
        email: bmwId.trim(),
        password,
        keepLoggedIn,
        deviceId: getDeviceId(),
      })
      if (data.requiresTwoFactor) {
        navigate('/otp', {
          state: { tempToken: data.tempToken, from, maskedEmail: data.maskedEmail },
        })
        return
      }
      if (!data.token) {
        setError(t('pages.login.errors.incorrect'))
        return
      }
      login(data.token, keepLoggedIn, data.user)
      navigate(
        from || (data.user.role === 'admin' ? '/admin' : '/'),
        { replace: true },
      )
    } catch (err) {
      setError(getErrorMessage(err, t('pages.login.errors.incorrect')))
    }
  }

  return (
    <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-white px-6">
      <div className="flex w-full max-w-5xl items-center gap-0">
        <div
          className={`w-full rounded-md border border-gray-200 bg-background p-10 transition-transform duration-700 ease-out md:w-[440px] ${
            settled ? '-translate-y-6' : 'translate-y-0'
          }`}
        >
          <h1 className="font-manrope text-3xl font-extralight text-gray-900">
            {t('pages.login.title')}
          </h1>
          {sessionExpired && (
            <p
              role="status"
              className="mt-4 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
            >
              {t('pages.login.sessionExpired')}
            </p>
          )}
          <p className="mt-4 text-sm text-gray-700">
            {t('pages.login.noBmwId')}{' '}
            <Link to="/register" className="font-bold underline">
              {t('common.here')}
            </Link>
          </p>

          {step === 'identifier' ? (
            <>
              <form onSubmit={handleContinue} className="mt-8">
                <label
                  htmlFor="bmwid"
                  className="text-sm font-medium text-gray-800"
                >
                  {t('pages.login.bmwIdLabel')}
                </label>
                <input
                  id="bmwid"
                  type="text"
                  value={bmwId}
                  onChange={(e) => setBmwId(e.target.value)}
                  autoComplete="username"
                  className="mt-2 w-full rounded border border-gray-400 px-4 py-3 text-sm text-gray-900"
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
                <button
                  type="submit"
                  className="mt-6 w-full rounded bg-gray-900 py-3 font-semibold text-white transition hover:bg-black"
                >
                  {t('common.continue')}
                </button>
              </form>
              <p className="mt-4 text-xs text-gray-500">{t('common.hcaptcha')}</p>
            </>
          ) : (
            <>
              <form onSubmit={handleLogin} className="mt-8">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-800"
                >
                  {t('common.password')}
                </label>
                <div className="relative mt-2">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded border border-gray-400 px-4 py-3 pr-12 text-sm text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? t('aria.hidePassword') : t('aria.showPassword')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}

                <div className="mt-4">
                  <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={keepLoggedIn}
                      onChange={(e) => setKeepLoggedIn(e.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-gray-400 bg-white transition-colors peer-checked:border-gray-900 peer-checked:bg-gray-900">
                      {keepLoggedIn && (
                        <Check className="h-3.5 w-3.5 text-white" />
                      )}
                    </span>
                    {t('common.keepLoggedIn')}
                  </label>
                </div>

                <div className="mt-4 text-right">
                  <Link
                    to="/reset-password"
                    className="text-sm font-bold text-gray-900 underline"
                  >
                    {t('common.setResetPassword')}
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={password.trim() === ''}
                  className={`mt-6 w-full rounded py-3 font-semibold transition-colors ${
                    password.trim() === ''
                      ? 'cursor-not-allowed bg-gray-300 text-gray-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {t('common.login')}
                </button>
              </form>
              <p className="mt-4 text-xs text-gray-500">
                {t('common.hcaptchaDetails')}{' '}
                <Link to="/data-privacy" className="underline">
                  {t('common.dataPrivacy')}
                </Link>{' '}
                {t('common.or')}{' '}
                <Link to="/legal-notice" className="underline">
                  {t('common.legalNotice')}
                </Link>
              </p>
            </>
          )}
        </div>

        <div
          className={`relative h-[calc(100dvh-160px)] max-h-[480px] flex-1 overflow-hidden rounded-md transition-transform duration-700 ease-out ${
            settled ? 'translate-y-6' : 'translate-y-0'
          }`}
        >
          <LoginSlideshow />
        </div>
      </div>
    </div>
  )
}

export default Login