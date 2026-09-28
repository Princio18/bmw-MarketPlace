import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/services/api'

function getAuthToken() {
  return (
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('authToken') ||
    ''
  )
}

function CreateAdminForm() {
  const { t } = useTranslation()
  const [values, setValues] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [serverError, setServerError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextErrors = {}
    if (!values.firstName.trim()) nextErrors.firstName = t('validation.firstNameRequired')
    if (!values.lastName.trim()) nextErrors.lastName = t('validation.lastNameRequired')
    if (!values.email.trim()) nextErrors.email = t('validation.emailRequired')
    if (!values.password) nextErrors.password = t('validation.passwordRequired')
    if (!values.confirm) {
      nextErrors.confirm = t('validation.confirmRequired')
    } else if (values.password !== values.confirm) {
      nextErrors.confirm = t('validation.passwordMismatch')
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || submitting) {
      return
    }

    setSubmitting(true)
    setServerError('')
    setSuccess('')
    try {
      await api.post(
        '/admin/create-admin',
        {
          first_name: values.firstName.trim(),
          last_name: values.lastName.trim(),
          email: values.email.trim(),
          password: values.password,
        },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } },
      )
      setValues({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
      setSuccess(t('createAdminForm.created'))
    } catch (err) {
      if (err.response?.status === 409) {
        setServerError(t('createAdminForm.exists'))
      } else {
        setServerError(t('createAdminForm.generic'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="adminFirstName" className="text-sm font-medium text-gray-800">
            {t('common.firstName')}
          </label>
          <Input
            id="adminFirstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            value={values.firstName}
            onChange={handleChange}
            aria-invalid={Boolean(errors.firstName)}
            className="mt-2 h-11 px-4"
          />
          {errors.firstName && (
            <p className="mt-1.5 text-xs text-destructive">{errors.firstName}</p>
          )}
        </div>

        <div>
          <label htmlFor="adminLastName" className="text-sm font-medium text-gray-800">
            {t('common.lastName')}
          </label>
          <Input
            id="adminLastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            value={values.lastName}
            onChange={handleChange}
            aria-invalid={Boolean(errors.lastName)}
            className="mt-2 h-11 px-4"
          />
          {errors.lastName && (
            <p className="mt-1.5 text-xs text-destructive">{errors.lastName}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="adminEmail" className="text-sm font-medium text-gray-800">
          {t('common.emailAddress')}
        </label>
        <Input
          id="adminEmail"
          name="email"
          type="email"
          autoComplete="off"
          value={values.email}
          onChange={handleChange}
          aria-invalid={Boolean(errors.email)}
          className="mt-2 h-11 px-4"
        />
        {errors.email && (
          <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="adminPassword" className="text-sm font-medium text-gray-800">
          {t('common.password')}*
        </label>
        <Input
          id="adminPassword"
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={handleChange}
          aria-invalid={Boolean(errors.password)}
          className="mt-2 h-11 px-4"
        />
        {errors.password && (
          <p className="mt-1.5 text-xs text-destructive">{errors.password}</p>
        )}
      </div>

      <div>
        <label htmlFor="adminPasswordConfirm" className="text-sm font-medium text-gray-800">
          {t('common.confirmPassword')}
        </label>
        <Input
          id="adminPasswordConfirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={values.confirm}
          onChange={handleChange}
          aria-invalid={Boolean(errors.confirm)}
          className="mt-2 h-11 px-4"
        />
        {errors.confirm && (
          <p className="mt-1.5 text-xs text-destructive">{errors.confirm}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}

      <Button type="submit" disabled={submitting} className="w-full h-11">
        {submitting ? t('common.creating') : t('createAdminForm.create')}
      </Button>
    </form>
  )
}

export default CreateAdminForm