'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { use, useState, useTransition } from 'react'

import { bibHref } from '@/lib/biblioteca-path'

interface Props {
  searchParamsPromise: Promise<{ redirect?: string }>
}

export function RegisterForm({ searchParamsPromise }: Props) {
  const params = use(searchParamsPromise)
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const passwordsMatch = password === confirm
  const passwordValid = password.length >= 8

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!passwordValid) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (!passwordsMatch) {
      setError('Las contraseñas no coinciden.')
      return
    }
    start(async () => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: fullName, password }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { detail?: string }
        setError(data.detail ?? 'No pudimos crear tu cuenta')
        return
      }
      const target =
        params.redirect && params.redirect.startsWith('/') ? params.redirect : bibHref('/biblioteca')
      router.replace(target)
      router.refresh()
    })
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <Field
        label="Nombre completo"
        type="text"
        autoComplete="name"
        value={fullName}
        onChange={setFullName}
        disabled={pending}
        required
      />
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        disabled={pending}
        required
      />
      <Field
        label="Contraseña (mín. 8)"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        disabled={pending}
        required
      />
      <Field
        label="Repetir contraseña"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
        disabled={pending}
        required
      />
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || !email || !fullName || !password || !confirm}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Crear cuenta
      </button>
    </form>
  )
}

interface FieldProps {
  label: string
  type: 'text' | 'email' | 'password'
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
