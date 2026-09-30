import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/useAuth'
import api from '../services/api'
import { getErrorMessage } from '../utils/getErrorMessage'

function AdminOtp() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { login } = useAuth()

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [maskedEmail, setMaskedEmail] = useState(state?.maskedEmail || '')
  const [cooldown, setCooldown] = useState(0)

  const cooldownActive = cooldown > 0

  useEffect(() => {
    if (!cooldownActive) return
    const id = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [cooldownActive])

  const sendCode = async () => {
    setSending(true)
    setError('')
    try {
      const { data } = await api.post('/auth/otp/email/send', {
        tempToken: state.tempToken,
      })
      setMaskedEmail(data.maskedEmail)
      setCooldown(60)
    } catch (err) {
      setError(getErrorMessage(err, t('otp.unableToSend')))
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (!state?.tempToken || maskedEmail) return
    sendCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!state?.tempToken) {
    return <Navigate to="/login" replace />
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/otp/email/verify', {
        tempToken: state.tempToken,
        code,
      })
      login(data.token, false, data.user)
      navigate(state.from || '/admin', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, t('otp.invalidCode')))
      setLoading(false)
    }
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-white px-6">
      <div className="w-full max-w-md rounded-md border border-gray-200 bg-white p-10 text-center">
        <h1 className="font-manrope text-2xl font-extralight text-gray-900">
          {t('otp.title')}
        </h1>

        {sending ? (
          <p className="mt-4 text-sm text-gray-700">{t('otp.sending')}</p>
        ) : maskedEmail ? (
          <>
            <p className="mt-4 text-sm text-gray-700">
              {t('otp.sent', { maskedEmail })}
            </p>
            <form onSubmit={handleVerify}>
              <input
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                className="mt-6 w-full rounded border border-gray-400 px-4 py-3 text-center font-manrope text-2xl tracking-widest text-gray-900"
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                autoFocus
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="mt-6 w-full rounded bg-gray-900 py-3 font-semibold text-white transition hover:bg-black disabled:opacity-50"
              >
                {loading ? t('common.verifying') : t('common.verify')}
              </button>
            </form>
            <button
              type="button"
              onClick={sendCode}
              disabled={cooldownActive || sending}
              className="mt-6 text-sm font-bold text-gray-900 underline disabled:no-underline disabled:opacity-50"
            >
              {cooldownActive
                ? t('otp.resendCooldown', { cooldown })
                : t('otp.resend')}
            </button>
          </>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            {error || t('otp.unableToSend')}
          </p>
        )}
      </div>
    </div>
  )
}

export default AdminOtp