import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import RegisterForm from '../components/auth/RegisterForm'
import RegisterImage from '../components/auth/RegisterImage'
import RegistrationProgress from '../components/auth/RegistrationProgress'

const PENDING_EMAIL_KEY = 'pendingRegistrationEmail'

function Register() {
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState('form')
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState('')
  const [resendError, setResendError] = useState('')
  const { t } = useTranslation()

  useEffect(() => {
    if (resendCooldown <= 0) return
    const id = setInterval(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [resendCooldown])

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      api
        .post('/auth/activate', { token })
        .then(({ data }) => {
          setEmail(data.email)
          setStep('confirmed')
          localStorage.removeItem(PENDING_EMAIL_KEY)
        })
        .catch(() => setStep('error'))
      return
    }

    const pendingEmail = localStorage.getItem(PENDING_EMAIL_KEY)
    if (pendingEmail) {
      setEmail(pendingEmail)
      setStep('pending')
    }
  }, [searchParams])

  const handleRegisterSuccess = (registeredEmail) => {
    localStorage.setItem(PENDING_EMAIL_KEY, registeredEmail)
    setEmail(registeredEmail)
    setStep('pending')
  }

  const handleBackToRegistration = () => {
    localStorage.removeItem(PENDING_EMAIL_KEY)
    setResendMessage('')
    setResendError('')
    setResendCooldown(0)
    setStep('form')
  }

  const handleResend = () => {
    if (!email) return
    setResending(true)
    setResendMessage('')
    setResendError('')
    api
      .post('/auth/resend-activation', { email })
      .then(() => {
        setResendMessage(t('registrationProgress.resendSent'))
        setResendCooldown(60)
      })
      .catch((err) => {
        setResendError(
          err.response?.data?.error || t('registrationProgress.resendFailed'),
        )
      })
      .finally(() => setResending(false))
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <main className="w-full overflow-y-auto bg-white no-scrollbar lg:w-[45%]">
        <div className="mx-auto flex min-h-full w-full max-w-[400px] flex-col justify-center px-6 py-12">
          {step === 'form' && <RegisterForm onSubmitSuccess={handleRegisterSuccess} />}

          {step === 'pending' && (
            <RegistrationProgress
              step={step}
              email={email}
              onResend={handleResend}
              onBack={handleBackToRegistration}
              resendLoading={resending}
              resendCooldown={resendCooldown}
              resendMessage={resendMessage}
              resendError={resendError}
            />
          )}

          {step === 'confirmed' && (
            <RegistrationProgress step={step} email={email} />
          )}

          {step === 'error' && (
            <div>
              <h1 className="font-manrope text-3xl font-extralight uppercase tracking-tight text-gray-900 md:text-4xl">
                {t('pages.register.activationFailed')}
              </h1>
              <p className="mt-4 text-sm text-gray-600">
                {t('pages.register.activationInvalid')}
              </p>
              <button
                type="button"
                onClick={handleBackToRegistration}
                className="mt-8 w-full rounded bg-gray-900 py-3 font-semibold text-white transition hover:bg-black"
              >
                {t('common.backToRegistration')}
              </button>
            </div>
          )}
        </div>
      </main>

      <aside className="relative hidden lg:block lg:w-[55%]">
        <RegisterImage />
      </aside>
    </div>
  )
}

export default Register