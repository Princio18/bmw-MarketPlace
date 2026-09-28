import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const RING_RADIUS = 23
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function RegistrationProgress({
  step,
  email,
  onResend,
  onBack,
  resendLoading,
  resendCooldown,
  resendMessage,
  resendError,
}) {
  const confirmed = step === 'confirmed'
  const dashOffset = confirmed ? 0 : RING_CIRCUMFERENCE / 2
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div>
      <div className="relative flex h-14 w-14 items-center justify-center">
        <svg
          width="56"
          height="56"
          viewBox="0 0 56 56"
          className="-rotate-90"
        >
          <circle
            cx="28"
            cy="28"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="4"
            className="stroke-gray-200"
          />
          <circle
            cx="28"
            cy="28"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="4"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="stroke-blue-600 transition-all duration-700 ease-out"
          />
        </svg>
        <Check size={24} className="absolute text-blue-600" />
      </div>

      <h1 className="mt-4 text-2xl font-semibold uppercase text-gray-900 md:text-3xl">
        {confirmed
          ? t('registrationProgress.activated')
          : t('registrationProgress.pendingHeadline')}
      </h1>
      {confirmed && (
        <p className="mt-2 text-gray-600">
          {t('registrationProgress.success')}
        </p>
      )}

      <div className="relative mt-10">
        <div className="absolute bottom-8 left-4 top-8 w-px bg-gray-200" />

        <div className="relative flex gap-6 pb-8">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              confirmed ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white'
            }`}
          >
            1
          </span>
          <div>
            <h2
              className={`text-base font-semibold ${
                confirmed ? 'text-gray-500' : 'text-gray-900'
              }`}
            >
              {t('registrationProgress.confirmTitle')}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {t('registrationProgress.confirmText1')}{' '}
              {t('registrationProgress.confirmText2')}
            </p>
            <p className="mt-2 text-sm font-bold text-gray-900">{email}</p>
            {confirmed && (
              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-green-600">
                <Check size={16} className="shrink-0" />
                {t('registrationProgress.registrationConfirmed')}
              </div>
            )}
          </div>
        </div>

        <div className="relative flex gap-6">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              confirmed ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}
          >
            2
          </span>
          <div>
            <h2
              className={`text-base font-semibold ${
                confirmed ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              {t('registrationProgress.loginTitle')}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {t('registrationProgress.loginText1')}{' '}
              {t('registrationProgress.loginText2')}
            </p>
          </div>
        </div>
      </div>

      {confirmed && (
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mt-8 w-full rounded bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          {t('common.login')}
        </button>
      )}

      {!confirmed && onResend && (
        <div className="mt-8 flex flex-col gap-3">
          {resendMessage && (
            <p className="text-center text-sm font-medium text-emerald-600">
              {resendMessage}
            </p>
          )}
          {resendError && (
            <p className="text-center text-sm font-medium text-red-600">
              {resendError}
            </p>
          )}
          <button
            type="button"
            onClick={onResend}
            disabled={resendLoading || resendCooldown > 0}
            className="w-full rounded bg-gray-900 py-3 font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resendLoading
              ? t('registrationProgress.resending')
              : resendCooldown > 0
                ? t('registrationProgress.resendCooldown', {
                    cooldown: resendCooldown,
                  })
                : t('registrationProgress.resendEmail')}
          </button>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-full rounded border border-gray-900 py-3 font-semibold text-gray-900 transition hover:bg-gray-100"
            >
              {t('common.backToRegistration')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default RegistrationProgress