import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Eye, EyeOff, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/services/api'
import { getErrorMessage } from '@/utils/getErrorMessage'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const passwordRules = [
  {
    label: 'registerForm.rule1',
    test: (pw) => pw.length >= 10 && pw.length <= 40,
  },
  {
    label: 'registerForm.rule2',
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    label: 'registerForm.rule3',
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    label: 'registerForm.rule4',
    test: (pw) => /[0-9]/.test(pw),
  },
  {
    label: 'registerForm.rule5',
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
  },
]

function RegisterForm({ onSubmitSuccess }) {
  const { t } = useTranslation()
  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  })
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleBlur = (e) => {
    const { name } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
  }

  const emailIsValid = EMAIL_REGEX.test(values.email.trim())

  const errors = {
    firstName: touched.firstName && !values.firstName.trim()
      ? t('validation.firstNameRequired')
      : '',
    lastName: touched.lastName && !values.lastName.trim()
      ? t('validation.lastNameRequired')
      : '',
    email:
      touched.email && !values.email.trim()
        ? t('validation.emailRequired')
        : touched.email && !emailIsValid
          ? t('validation.emailInvalid')
          : '',
    password: touched.password && !values.password
      ? t('validation.passwordRequired')
      : '',
  }

  const allRulesMet = passwordRules.every((rule) =>
    rule.test(values.password),
  )

  const isFormValid =
    values.firstName.trim() !== '' &&
    values.lastName.trim() !== '' &&
    emailIsValid &&
    allRulesMet

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid || submitting) return
    setSubmitting(true)
    setServerError('')
    try {
      const { data } = await api.post('/auth/register', {
        first_name: values.firstName.trim(),
        last_name: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password,
      })
      onSubmitSuccess?.(data.user?.email || values.email.trim())
    } catch (err) {
      setServerError(getErrorMessage(err, t('registerForm.registrationFailed')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="font-manrope text-3xl font-extralight uppercase tracking-tight text-gray-900 md:text-4xl">
        {t('registerForm.title')}
      </h1>

      <p className="mt-3 text-sm text-gray-600">
        {t('registerForm.alreadyHaveBmwId')}{' '}
        <Link
          to="/login"
          className="font-bold text-gray-900 underline hover:text-bmw-blue"
        >
          {t('common.here')}
        </Link>
      </p>

      <p className="mt-1 text-xs text-gray-500">{t('common.mandatoryFields')}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <div>
          <label htmlFor="firstName" className="text-sm font-medium text-gray-800">
            {t('common.firstName')}
          </label>
          <Input
            id="firstName"
            name="firstName"
            value={values.firstName}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={Boolean(errors.firstName)}
            className="mt-2 h-11 px-4"
          />
          {errors.firstName && (
            <p className="mt-1.5 text-xs text-destructive">{errors.firstName}</p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className="text-sm font-medium text-gray-800">
            {t('common.lastName')}
          </label>
          <Input
            id="lastName"
            name="lastName"
            value={values.lastName}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={Boolean(errors.lastName)}
            className="mt-2 h-11 px-4"
          />
          {errors.lastName && (
            <p className="mt-1.5 text-xs text-destructive">{errors.lastName}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-medium text-gray-800">
            {t('common.emailAddress')}
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={Boolean(errors.email)}
            className="mt-2 h-11 px-4"
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium text-gray-800">
            {t('common.password')}*
          </label>
          <div className="relative mt-2">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={Boolean(errors.password)}
              className="h-11 pr-11 pl-4"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? t('aria.hidePassword') : t('aria.showPassword')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-destructive">{errors.password}</p>
          )}

          <ul className="mt-3 space-y-1.5">
            {passwordRules.map((rule) => {
              const met = rule.test(values.password)
              return (
                <li
                  key={rule.label}
                  className={`flex items-center gap-2 text-xs transition-colors ${
                    met ? 'text-emerald-600' : 'text-gray-400'
                  }`}
                >
                  {met ? (
                    <Check size={14} className="shrink-0 text-emerald-500" />
                  ) : (
                    <X size={14} className="shrink-0 text-red-500" />
                  )}
                  {t(rule.label)}
                </li>
              )
            })}
          </ul>
        </div>

        <Button
          type="submit"
          disabled={!isFormValid || submitting}
          className="mt-2 h-12 w-full rounded-md text-sm transition-colors disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
        >
          {submitting ? t('common.registering') : t('common.registerNow')}
        </Button>
        {serverError && (
          <p className="mt-3 text-center text-xs font-medium text-destructive">
            {serverError}
          </p>
        )}
      </form>
    </div>
  )
}

export default RegisterForm