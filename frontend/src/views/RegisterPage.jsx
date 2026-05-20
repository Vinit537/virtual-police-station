import { Controller, useForm } from 'react-hook-form'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/AuthContext'
import { useOtp } from '../api/hooks'
import { useTranslation, LANGUAGES } from '../i18n/LanguageContext'
import { Field, Alert } from '../ui/Shared'

const step1Schema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  email: z
    .string()
    .email('Valid email required')
    .regex(/^[a-zA-Z0-9._%+-]+@gmail\.com$/i, 'Only valid Gmail addresses are allowed'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const step2Schema = z.object({
  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits'),
})

const step3Schema = z.object({
  role: z.enum(['CITIZEN', 'POLICE', 'ADMIN']),
})

const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema)

function formatAadhaarInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 12)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function StepIndicator({ current, labels }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      {labels.map((label, idx) => {
        const done = idx < current
        const active = idx === current

        return (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                  done
                    ? 'bg-ok text-white'
                    : active
                      ? 'bg-policeBlue text-white shadow-glow'
                      : 'bg-policeBlue-50 text-policeBlue-300'
                }`}
              >
                {done ? '✓' : idx + 1}
              </div>
              <span
                className={`mt-1 text-center text-[10px] font-semibold leading-tight ${
                  active ? 'text-policeBlue' : done ? 'text-ok' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
            </div>
            {idx < labels.length - 1 && (
              <div className={`mx-2 mb-4 h-0.5 flex-1 transition-all ${done ? 'bg-ok' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function OtpPanel({ aadhaarNumber, otp }) {
  const [otpCode, setOtpCode] = useState('')
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-policeBlue-100 bg-policeBlue-50 p-4">
        <p className="mb-3 text-sm font-semibold text-policeBlue">{t('reg_otp_title')}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            id="otp-generate"
            data-testid="otp-generate"
            type="button"
            disabled={otp.loading}
            onClick={() => otp.generate(aadhaarNumber)}
            className="btn btn-primary btn-sm flex-1"
          >
            {otp.loading && !otp.generated ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : '📲'}
            {t('reg_send_otp')}
          </button>
          <input
            id="otp-input"
            data-testid="otp-input"
            className="input flex-1"
            placeholder={t('reg_otp_placeholder')}
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
          />
          <button
            id="otp-verify"
            data-testid="otp-verify"
            type="button"
            disabled={otp.loading || !otpCode}
            onClick={() => otp.verify(aadhaarNumber, otpCode)}
            className="btn btn-gold btn-sm flex-1"
          >
            {t('reg_verify')}
          </button>
        </div>

        {otp.error && <p className="mt-2 text-xs text-err">{otp.error}</p>}

        {otp.debugOtp && (
          <div className="mt-3 rounded-lg bg-policeGold/15 px-3 py-2 text-xs">
            <span className="font-medium text-policeBlue-700">{t('reg_otp_debug')} </span>
            <code className="font-bold text-policeBlue">{otp.debugOtp}</code>
          </div>
        )}

        {otp.verified && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ok">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ok text-[9px] text-white">✓</span>
            {t('reg_otp_verified')}
          </div>
        )}
      </div>
    </div>
  )
}

export function RegisterPage() {
  const { register: signUp } = useAuth()
  const { t, lang, setLang } = useTranslation()
  const [step, setStep] = useState(0)
  const [serverError, setServerError] = useState('')
  const otp = useOtp()

  const {
    register,
    control,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(fullSchema),
    defaultValues: { role: 'CITIZEN' },
    mode: 'onTouched',
  })

  const steps = [t('reg_step1'), t('reg_step2'), t('reg_step3')]
  const aadhaarNumber = watch('aadhaarNumber')
  const isFinalStep = step === steps.length - 1

  const goNext = async () => {
    let valid = false
    if (step === 0) valid = await trigger(['fullName', 'email', 'password'])
    if (step === 1) {
      valid = await trigger(['aadhaarNumber'])
      if (valid && !otp.verified) {
        setServerError(t('reg_verify_required_step'))
        return
      }
    }
    if (valid) {
      setServerError('')
      setStep((current) => current + 1)
    }
  }

  const onSubmit = async (values) => {
    if (!isFinalStep) {
      setServerError(t('reg_complete_setup_first') || 'Please complete account setup before registering.')
      return
    }
    setServerError('')
    if (!otp.verified || otp.verifiedAadhaar !== values.aadhaarNumber) {
      setServerError(t('reg_verify_required_submit'))
      return
    }
    try {
      await signUp(values)
    } catch (err) {
      setServerError(err?.response?.data?.error ?? t('reg_failed'))
    }
  }

  return (
    <div className="w-full max-w-lg animate-slide-up">
      <div
        className="mb-5 rounded-2xl p-5 text-center shadow-float"
        style={{ background: 'linear-gradient(135deg, #0D1947 0%, #1F3A93 50%, #2D52C4 100%)' }}
      >
        <h1 className="font-heading text-xl font-bold text-white">{t('reg_title')}</h1>
        <p className="mt-1 text-xs text-blue-200">{t('reg_header_subtitle')} - {t('reg_title')}</p>
      </div>

      <div className="card p-6">
        <StepIndicator current={step} labels={steps} />

        {serverError && <Alert type="error">{serverError}</Alert>}

        <form
          onSubmit={(e) => e.preventDefault()}
          noValidate
          className={serverError ? 'mt-4' : ''}
        >
          {step === 0 && (
            <div className="animate-fade-in space-y-4">
              <Field label={t('reg_name')} error={errors.fullName?.message}>
                <input id="reg-fullName" data-testid="reg-fullname" className="input" placeholder={t('reg_placeholder_name')} {...register('fullName')} />
              </Field>
              <Field label={t('reg_email')} error={errors.email?.message}>
                <input id="reg-email" data-testid="reg-email" className="input" type="email" placeholder={t('reg_placeholder_email')} {...register('email')} />
              </Field>
              <Field label={t('reg_password')} error={errors.password?.message}>
                <input id="reg-password" data-testid="reg-password" className="input" type="password" placeholder="••••••••" {...register('password')} />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade-in space-y-4">
              <Field label={t('reg_aadhaar')} error={errors.aadhaarNumber?.message}>
                <Controller
                  name="aadhaarNumber"
                  control={control}
                  render={({ field }) => (
                    <input
                      id="reg-aadhaar"
                      data-testid="reg-aadhaar"
                      className="input"
                      placeholder="XXXX XXXX XXXX"
                      maxLength={14}
                      value={formatAadhaarInput(field.value)}
                      onBlur={field.onBlur}
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      ref={field.ref}
                    />
                  )}
                />
              </Field>
              <OtpPanel aadhaarNumber={aadhaarNumber} otp={otp} />
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in space-y-4">
              <Field label={t('reg_role')} error={errors.role?.message}>
                <select id="reg-role" data-testid="reg-role" className="input" {...register('role')}>
                  <option value="CITIZEN">🧑 {t('reg_role_citizen')}</option>
                  <option value="POLICE">🚓 {t('reg_role_police')}</option>
                  <option value="ADMIN">🛡️ {t('reg_role_admin')}</option>
                </select>
              </Field>

              <Field label={t('reg_lang')}>
                <select
                  id="reg-language"
                  className="input"
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                >
                  {LANGUAGES.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.native} - {language.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="rounded-xl border border-policeGold/30 bg-policeGold/8 p-4 text-sm text-policeBlue-700">
                <p className="mb-1 font-semibold text-policeBlue">{t('reg_review_title')}</p>
                <ul className="space-y-1 text-xs text-slate-600">
                  <li>✓ {t('reg_review_personal_ok')}</li>
                  <li className={otp.verified ? 'text-ok' : 'text-err'}>
                    {otp.verified ? `✓ ${t('reg_review_aadhaar_ok')}` : `✕ ${t('reg_review_aadhaar_missing')}`}
                  </li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            {step > 0 ? (
              <button type="button" onClick={() => setStep((current) => current - 1)} className="btn btn-outline btn-sm">
                ← {t('reg_back')}
              </button>
            ) : (
              <div />
            )}

            {step < 2 ? (
              <button id="reg-next" data-testid="reg-next" type="button" onClick={goNext} className="btn btn-primary btn-sm">
                {t('reg_next')} →
              </button>
            ) : (
              <button
                id="reg-submit"
                data-testid="reg-submit"
                type="button"
                disabled={isSubmitting || !otp.verified}
                onClick={handleSubmit(onSubmit)}
                className="btn btn-gold"
              >
                {isSubmitting ? `${t('reg_create')}...` : t('reg_create')}
              </button>
            )}
          </div>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {t('reg_have_account')}{' '}
          <Link to="/login" className="font-semibold text-policeBlue hover:underline">
            {t('reg_login_link')}
          </Link>
        </p>
      </div>
    </div>
  )
}
