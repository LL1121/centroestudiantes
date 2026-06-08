'use client'

import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { UserRead, UserRole } from '@/lib/api/types'

const ROLES: UserRole[] = ['alumno', 'moderador', 'admin']

export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserRead[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [pending, start] = useTransition()

  const load = useCallback(async (search?: string) => {
    setLoading(true)
    const sp = new URLSearchParams()
    if (search?.trim()) sp.set('q', search.trim())
    const res = await fetch(`/api/admin/users?${sp.toString()}`, { cache: 'no-store' })
    if (!res.ok) {
      toast.error('No pudimos cargar usuarios')
      setLoading(false)
      return
    }
    setUsers((await res.json()) as UserRead[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const patchUser = (id: string, payload: Record<string, unknown>) => {
    start(async () => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        toast.error('No pudimos actualizar el usuario')
        return
      }
      toast.success('Usuario actualizado')
      await load(q)
    })
  }

  const resetPassword = (id: string, email: string) => {
    start(async () => {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, { method: 'POST' })
      if (!res.ok && res.status !== 204) {
        toast.error('No pudimos enviar el reset')
        return
      }
      toast.success(`Enlace de reset enviado a ${email}`)
    })
  }

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void load(q)
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por email o nombre"
          className="h-10 flex-1 rounded-xl border border-border px-3 text-sm"
        />
        <button
          type="submit"
          className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Buscar
        </button>
      </form>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </p>
      ) : (
        <ul className="space-y-3">
          {users.map((u) => (
            <li
              key={u.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-navy">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  <p className="mt-1 text-[10px] uppercase text-muted-foreground">
                    {u.role} · {u.is_active ? 'activo' : 'inactivo'} · 2FA:{' '}
                    {u.twofa_enabled ? 'sí' : 'no'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={u.role}
                    disabled={pending}
                    onChange={(e) => patchUser(u.id, { role: e.target.value })}
                    className="h-9 rounded-lg border border-border px-2 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => patchUser(u.id, { is_active: !u.is_active })}
                    className="h-9 rounded-lg border border-border px-3 text-xs font-medium"
                  >
                    {u.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => resetPassword(u.id, u.email)}
                    className="h-9 rounded-lg border border-border px-3 text-xs font-medium text-primary"
                  >
                    Reset pass
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
