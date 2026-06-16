'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { use, useState, useTransition } from 'react'

import { bibHref } from '@/lib/biblioteca-path'

interface Props {
  searchParamsPromise: Promise<{ redirect?: string }>
}

type Step = 'credentials' | '2fa'

export function LoginForm({ searchParamsPromise }: Props) {
  const params = use(searchParamsPromise)
  const router = useRouter()
  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [challengeToken, setChallengeToken] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [method, setMethod] = useState<'totp' | 'email' | 'backup'>('totp')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const redirectTarget =
    params.redirect && params.redirect.startsWith('/') ? params.redirect : bibHref('/biblioteca')

  const onCredentials = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    start(async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        detail?: string
        requires_2fa?: boolean
        challenge_token?: string
      }
      if (!response.ok) {
        setError(data.detail ?? 'No pudimos validar tus credenciales')
        return
      }
      if (data.requires_2fa && data.challenge_token) {
        setChallengeToken(data.challenge_token)
        setStep('2fa')
        return
      }
      router.replace(redirectTarget)
      router.refresh()
    })
  }

  const onVerify2fa = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!challengeToken) return
    setError(null)
    start(async () => {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_token: challengeToken,
          code: code.trim(),
          method,
        }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { detail?: string }
        setError(data.detail ?? 'Código incorrecto')
        return
      }
      router.replace(redirectTarget)
      router.refresh()
    })
  }

  const sendEmailCode = () => {
    if (!challengeToken) return
    start(async () => {
      const res = await fetch('/api/auth/2fa/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_token: challengeToken }),
      })
      if (res.ok || res.status === 204) {
        setMethod('email')
        setError(null)
      } else {
        const data = (await res.json().catch(() => ({}))) as { detail?: string }
        setError(data.detail ?? 'No pudimos enviar el código por email')
      }
    })
  }

  if (step === '2fa') {
    return (
      <form className="space-y-4" onSubmit={onVerify2fa} noValidate>
        <p className="text-sm text-muted-foreground">
          Tu cuenta tiene verificación en dos pasos. Ingresá el código de tu app autenticadora, el
          que te enviamos por email o un código de respaldo.
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-navy">Método</span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as 'totp' | 'email' | 'backup')}
            className="block h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
          >
            <option value="totp">App autenticadora</option>
            <option value="email">Código por email</option>
            <option value="backup">Código de respaldo</option>
          </select>
        </label>
        {method === 'email' && (
          <button
            type="button"
            onClick={sendEmailCode}
            disabled={pending}
            className="text-xs font-medium text-primary hover:underline"
          >
            Enviar código por email
          </button>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-navy">Código</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={pending}
            required
            className="block h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
            autoComplete="one-time-code"
          />
        </label>
        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Verificar
        </button>
        <button
          type="button"
          onClick={() => setStep('credentials')}
          className="w-full text-xs text-muted-foreground hover:text-primary"
        >
          Volver
        </button>
      </form>
    )
  }

  return (
    <form className="space-y-4" onSubmit={onCredentials} noValidate>
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        disabled={pending}
        required
      />
      <div>
        <Field
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          disabled={pending}
          required
        />
        <Link
          href="/recuperar"
          className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || !email || !password}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Ingresar
      </button>
    </form>
  )
}

interface FieldProps {
  label: string
  type: 'email' | 'password'
  autoComplete: string
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  required?: boolean
}

function Field({ label, type, autoComplete, value, onChange, disabled, required }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-navy">{label}</span>
      <input
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        className="block h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-navy outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
      />
    </label>
  )
}
