import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../i18n/LanguageContext'
import { Field, Alert } from '../ui/Shared'

const schema = z.object({
  email: z.email('Valid email required'),
  password: z.string().min(6, 'Minimum 6 characters'),
})

export function LoginPage() {
  const { login } = useAuth()
  const { t } = useTranslation()
  const [serverError, setServerError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values) => {
    setServerError('')
    try {
      await login(values.email, values.password)
    } catch (err) {
      setServerError(err?.response?.data?.error ?? t('login_failed'))
    }
  }

  return (
    <div className="w-full max-w-md animate-slide-up">
      <div
        className="mb-6 rounded-2xl p-6 text-center shadow-float"
        style={{ background: 'linear-gradient(135deg, #0D1947 0%, #1F3A93 50%, #2D52C4 100%)' }}
      >
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-policeGold shadow-gold-glow">
          <svg className="h-7 w-7 text-policeBlue-900" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L4 5v6c0 5.25 3.4 10.15 8 11.35C16.6 21.15 20 16.25 20 11V5l-8-3z" />
          </svg>
        </div>
        <h1 className="font-heading text-2xl font-bold text-white">{t('login_title')}</h1>
        <p className="mt-1 text-sm text-blue-200">{t('login_subtitle')}</p>
      </div>

      <div className="card p-6">
        <Alert type="error">{serverError}</Alert>

        <form className={`space-y-4 ${serverError ? 'mt-4' : ''}`} onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label={t('login_email')} error={errors.email?.message}>
            <input
              id="login-email"
              data-testid="login-email"
              className="input"
              placeholder="officer@police.gov.in"
              type="email"
              autoComplete="email"
              {...register('email')}
            />
          </Field>

          <Field label={t('login_password')} error={errors.password?.message}>
            <input
              id="login-password"
              data-testid="login-password"
              className="input"
              type="password"
              placeholder={t('reg_placeholder_password')}
              autoComplete="current-password"
              {...register('password')}
            />
          </Field>

          <button id="login-submit" data-testid="login-submit" type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('login_signing_in')}
              </>
            ) : t('login_btn')}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {t('login_no_account')}{' '}
          <Link to="/register" className="font-semibold text-policeBlue hover:underline">
            {t('login_register_link')}
          </Link>
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-policeGold/30 bg-policeGold/8 p-3 text-center text-xs text-policeBlue-700">
        <strong>{t('login_demo_label')}</strong> {t('login_demo_text')}
      </div>
    </div>
  )
}
