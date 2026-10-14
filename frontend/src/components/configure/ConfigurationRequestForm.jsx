import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Check, Info } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/useAuth'
import { getErrorMessage } from '../../utils/getErrorMessage'
import DealerMapPicker from './DealerMapPicker'

const SALUTATIONS = ['Mr', 'Ms', 'Mrs', 'Miss', 'Dr', 'Mx']
const CONTACT_PREFERENCES = ['email', 'phone']
const MARKETING_KEYS = ['apps', 'email', 'phone', 'sms', 'in_car', 'mail']
const PHONE_COUNTRY_CODES = [
  { value: '+44', label: '+44 · UK', country: '🇬🇧' },
  { value: '+33', label: '+33 · FR', country: '🇫🇷' },
  { value: '+49', label: '+49 · DE', country: '🇩🇪' },
  { value: '+353', label: '+353 · IE', country: '🇮🇪' },
  { value: '+1', label: '+1 · US', country: '🇺🇸' },
]

const NAME_MAX = 100
const NAME_REGEX = /^[A-Za-zÀ-ÿ' .-]+$/

function normalizePhoneDigits(value) {
  return value.replace(/[\s\-().]/g, '').replace(/[^0-9]/g, '')
}

const inputCls =
  'w-full rounded-sm border border-gray-400 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none'
const readonlyCls =
  'w-full rounded-sm border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500'
const errorCls = 'mt-1 block text-sm font-medium text-red-600'

// Formulaire de complétion d'une demande existante (« Update details »).
// L'email provient du compte et n'est PAS modifiable ici ; la soumission met à
// jour la MÊME demande via PUT (jamais de nouvelle ligne, jamais de statut).
function ConfigurationRequestForm({ requestId, initialRequest }) {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [salutation, setSalutation] = useState(initialRequest?.salutation ?? 'Mr')
  const [firstName, setFirstName] = useState(
    initialRequest?.firstName ?? user?.firstName ?? '',
  )
  const [lastName, setLastName] = useState(
    initialRequest?.lastName ?? user?.lastName ?? '',
  )
  const [contactPreference, setContactPreference] = useState(
    initialRequest?.contactPreference ?? 'email',
  )
  const email = initialRequest?.email ?? user?.email ?? ''
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    initialRequest?.phoneCountryCode ?? '+44',
  )
  const [phoneNumber, setPhoneNumber] = useState(initialRequest?.phoneNumber ?? '')
  const [preferredDealerId, setPreferredDealerId] = useState(
    initialRequest?.preferredDealerId ?? null,
  )
  const [marketingChannels, setMarketingChannels] = useState(
    Array.isArray(initialRequest?.marketingChannels)
      ? initialRequest.marketingChannels
      : [],
  )
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const toggleMarketing = (key) => {
    setMarketingChannels((current) =>
      current.includes(key)
        ? current.filter((c) => c !== key)
        : [...current, key],
    )
  }

  const clearError = (field) => {
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const validate = () => {
    const next = {}

    if (!firstName.trim()) next.firstName = t('confirmRequest.errors.firstNameRequired')
    else if (firstName.trim().length > NAME_MAX || !NAME_REGEX.test(firstName.trim())) {
      next.firstName = t('confirmRequest.errors.firstNameInvalid')
    }

    if (!lastName.trim()) next.lastName = t('confirmRequest.errors.lastNameRequired')
    else if (lastName.trim().length > NAME_MAX || !NAME_REGEX.test(lastName.trim())) {
      next.lastName = t('confirmRequest.errors.lastNameInvalid')
    }

    const digits = normalizePhoneDigits(phoneNumber)
    if (contactPreference === 'phone' && !phoneNumber.trim()) {
      next.phone = t('confirmRequest.errors.phoneRequired')
    } else if (phoneNumber.trim() && (digits.length < 7 || digits.length > 15)) {
      next.phone = t('confirmRequest.errors.phoneInvalid')
    }

    if (!preferredDealerId) next.centre = t('confirmRequest.errors.centreRequired')

    return next
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')

    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const normalizedPhone = phoneNumber.trim() ? normalizePhoneDigits(phoneNumber) : ''

    setSubmitting(true)
    try {
      await api.put(`/configuration-requests/${requestId}`, {
        salutation,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        contactPreference,
        phoneCountryCode: normalizedPhone ? phoneCountryCode : null,
        phoneNumber: normalizedPhone || null,
        preferredDealerId,
        marketingChannels,
      })
      setSubmitted(true)
    } catch (err) {
      setServerError(getErrorMessage(err, t('confirmRequest.errors.general')))
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center rounded-sm border border-green-200 bg-green-50 px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600">
          <Check size={24} className="text-white" />
        </span>
        <p className="mt-4 font-manrope text-lg font-light text-gray-900">
          {t('confirmRequest.updated')}
        </p>
        <Link
          to="/my-requests"
          className="mt-6 rounded-sm bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {t('confirmRequest.viewMyRequests')}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-600">
          {t('confirmRequest.salutation')}
        </label>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {SALUTATIONS.map((value) => (
            <label key={value} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="salutation"
                value={value}
                checked={salutation === value}
                onChange={() => setSalutation(value)}
                className="h-4 w-4 accent-blue-600"
              />
              <span className="text-sm text-gray-900">{value}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-600">
            {t('confirmRequest.firstName')} *
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value)
              clearError('firstName')
            }}
            maxLength={NAME_MAX}
            className={inputCls}
          />
          {errors.firstName && <span className={errorCls}>{errors.firstName}</span>}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-600">
            {t('confirmRequest.lastName')} *
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value)
              clearError('lastName')
            }}
            maxLength={NAME_MAX}
            className={inputCls}
          />
          {errors.lastName && <span className={errorCls}>{errors.lastName}</span>}
        </div>
      </div>

      <div className="mt-6">
        <label className="mb-2 block text-sm font-medium text-gray-600">
          {t('confirmRequest.contactHow')} *
        </label>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          {CONTACT_PREFERENCES.map((value) => (
            <label key={value} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="contactPreference"
                value={value}
                checked={contactPreference === value}
                onChange={() => setContactPreference(value)}
                className="h-4 w-4 accent-blue-600"
              />
              <span className="text-sm text-gray-900">
                {t(`confirmRequest.contactOption.${value}`)}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-600">
            {t('confirmRequest.email')}
          </label>
          <input type="email" value={email} readOnly className={readonlyCls} />
          <span className="mt-1 block text-xs text-gray-500">
            {t('confirmRequest.emailReadonlyHint')}
          </span>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-600">
            {t('confirmRequest.phone')}
            {contactPreference === 'phone' && ' *'}
          </label>
          <div className="flex gap-2">
            <select
              value={phoneCountryCode}
              onChange={(e) => setPhoneCountryCode(e.target.value)}
              className="w-32 rounded-sm border border-gray-400 bg-white px-2 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
            >
              {PHONE_COUNTRY_CODES.map(({ value, country }) => (
                <option key={value} value={value}>
                  {country} {value}
                </option>
              ))}
            </select>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value)
                clearError('phone')
              }}
              placeholder="07123 456789"
              className={inputCls}
            />
          </div>
          {errors.phone && <span className={errorCls}>{errors.phone}</span>}
        </div>
      </div>

      <div className="mt-8">
        <label className="mb-3 block text-sm font-medium text-gray-600">
          {t('confirmRequest.preferredCentre')} *
        </label>
        <DealerMapPicker
          selectedDealerId={preferredDealerId}
          onSelectDealer={(id) => {
            setPreferredDealerId(id)
            clearError('centre')
          }}
          showError={Boolean(errors.centre)}
        />
      </div>

      <div className="mt-10">
        <h3 className="text-base font-bold uppercase tracking-wide text-gray-900">
          {t('confirmRequest.marketingTitle')}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          {t('confirmRequest.marketingIntro')}
        </p>

        <div className="mt-4 grid gap-x-10 gap-y-2.5 md:grid-cols-2">
          {MARKETING_KEYS.map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={marketingChannels.includes(key)}
                onChange={() => toggleMarketing(key)}
                className="h-4 w-4 accent-blue-600"
              />
              <span className="text-sm text-gray-900">
                {t(`confirmRequest.marketingOptions.${key}`)}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>{t('confirmRequest.marketingInfo')}</p>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {t('confirmRequest.marketingWithdraw')}
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-gray-200 bg-gray-50 p-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">
          {t('confirmRequest.benefitsTitle')}
        </h3>
        <p className="mt-2 text-sm text-gray-700">
          {t('confirmRequest.benefitsIntro')}
        </p>
        <ul className="mt-4 space-y-2.5">
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className="flex items-start gap-2">
              <Check size={16} className="mt-0.5 shrink-0 text-green-600" />
              <span className="text-sm text-gray-800">
                {t(`confirmRequest.benefit${n}`)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-8 rounded-sm bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? t('confirmRequest.pleaseWait')
          : t('confirmRequest.updateDetails')}
      </button>

      <p className="mt-6 max-w-3xl text-xs leading-relaxed text-gray-500">
        {t('confirmRequest.privacyBefore')}
        <a href="#" className="underline">
          {t('confirmRequest.privacyBmwLink')}
        </a>
        {t('confirmRequest.privacyMid')}
        <a href="#" className="underline">
          {t('confirmRequest.privacyRetailerLink')}
        </a>
        {t('confirmRequest.privacyAfter')}
      </p>
    </form>
  )
}

export default ConfigurationRequestForm
