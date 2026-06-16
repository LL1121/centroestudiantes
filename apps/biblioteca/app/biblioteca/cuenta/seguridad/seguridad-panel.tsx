'use client'

import { Loader2, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { UserRead } from '@/lib/api/types'

interface Props {
  user: UserRead
}

interface SetupData {
  secret: string
  provisioning_uri: string
  qr_data_url: string
}

export function SeguridadPanel({ user }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [setup, setSetup] = useState<SetupData | null>(null)
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)

  const onSetup = () => {
    start(async () => {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      if (!res.ok) {
        toast.error('No pudimos iniciar la configuración 2FA')
        return
      }
      setSetup((await res.json()) as SetupData)
    })
  }

  const onEnable = () => {
    if (!code.trim()) return
    start(async () => {
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string }
        toast.error(body.detail ?? 'Código inválido')
        return
      }
      const data = (await res.json()) as { backup_codes: string[] }
      setBackupCodes(data.backup_codes)
      setSetup(null)
      setCode('')
      toast.success('Verificación en dos pasos activada')
      router.refresh()
    })
  }

  const onDisable = () => {
    if (!code.trim()) return
    start(async () => {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      if (!res.ok && res.status !== 204) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string }
        toast.error(body.detail ?? 'No pudimos desactivar 2FA')
        return
      }
      setCode('')
      toast.success('2FA desactivado')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
        <h2 className="font-serif text-lg font-bold text-navy">Verificación en dos pasos</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        Estado:{' '}
        <span className="font-semibold text-navy">
          {user.twofa_enabled ? 'Activo (TOTP + email de respaldo)' : 'Inactivo'}
        </span>
      </p>

      {!user.twofa_enabled && !setup && (
        <button
          type="button"
          onClick={onSetup}
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Configurar 2FA
        </button>
      )}

      {setup && (
        <div className="space-y-4 rounded-xl border border-border bg-secondary/20 p-4">
          <p className="text-sm text-navy">
            Escaneá el QR con Google Authenticator, Authy u otra app compatible.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr_data_url} alt="QR 2FA" className="mx-auto h-48 w-48 rounded-lg bg-white p-2" />
          <p className="break-all text-xs text-muted-foreground">Clave manual: {setup.secret}</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código de 6 dígitos"
            className="block h-11 w-full rounded-xl border border-border px-3 text-sm"
          />
          <button
            type="button"
            onClick={onEnable}
            disabled={pending || !code.trim()}
            className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Activar 2FA
          </button>
        </div>
      )}

      {backupCodes && (
        <div className="rounded-xl border border-gold/40 bg-gold/10 p-4">
          <p className="text-sm font-semibold text-navy">Guardá estos códigos de respaldo (una sola vez):</p>
          <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-xs">
            {backupCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {user.twofa_enabled && (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">Para desactivar, ingresá un código TOTP válido.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código TOTP"
            className="block h-11 w-full rounded-xl border border-border px-3 text-sm"
          />
          <button
            type="button"
            onClick={onDisable}
            disabled={pending || !code.trim()}
            className="h-10 rounded-xl border border-destructive/40 px-4 text-sm font-semibold text-destructive disabled:opacity-50"
          >
            Desactivar 2FA
          </button>
        </div>
      )}
    </div>
  )
}
