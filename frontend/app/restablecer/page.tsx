'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useTransition } from 'react'

import { passwordStrengthMessage } from '@/lib/password-policy'

function ResetInner() {
  const params = useSearchParams()
  const token = params.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const err = passwordStrengthMessage(password)
    if (err) {
      setMessage(err)
      return
    }
    if (password !== confirm) {
      setMessage('Las contraseñas no coinciden.')
      return
    }
    if (!token) {
      setMessage('Enlace inválido.')
      return
    }
    start(async () => {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string }
        setMessage(body.detail ?? 'No pudimos restablecer la contraseña.')
        return
      }
      setMessage('Contraseña actualizada. Ya podés iniciar sesión.')
    })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full space-y-4 rounded-2xl border border-border bg-card p-6">
        <h1 className="font-serif text-xl font-bold text-navy">Nueva contraseña</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nueva contraseña"
          className="block h-11 w-full rounded-xl border border-border px-3 text-sm"
          required
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repetir contraseña"
          className="block h-11 w-full rounded-xl border border-border px-3 text-sm"
          required
        />
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          Guardar
        </button>
      </form>
    </main>
  )
}

export default function RestablecerPage() {
  return (
    <Suspense>
      <ResetInner />
    </Suspense>
  )
}
