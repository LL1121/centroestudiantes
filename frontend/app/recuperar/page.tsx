'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

import { bibHref } from '@/lib/biblioteca-path'

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    start(async () => {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok && res.status !== 204) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string }
        setMessage(body.detail ?? 'No pudimos procesar la solicitud.')
        return
      }
      setMessage(
        'Si el email está registrado, te enviamos un enlace para restablecer la contraseña. Revisá tu bandeja de entrada.',
      )
    })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full space-y-4 rounded-2xl border border-border bg-card p-6">
        <h1 className="font-serif text-xl font-bold text-navy">Recuperar cuenta</h1>
        <p className="text-xs text-muted-foreground">
          Ingresá tu email y te enviaremos un enlace para elegir una nueva contraseña.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          className="block h-11 w-full rounded-xl border border-border px-3 text-sm"
        />
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
        <button
          type="submit"
          disabled={pending || !email.trim()}
          className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {pending ? 'Enviando…' : 'Enviar enlace'}
        </button>
        <Link
          href={bibHref('/biblioteca/login')}
          className="block text-center text-xs font-medium text-primary hover:underline"
        >
          Volver al inicio de sesión
        </Link>
      </form>
    </main>
  )
}
