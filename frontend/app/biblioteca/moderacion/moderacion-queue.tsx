'use client'

import { Check, Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { MaterialRead } from '@/lib/api/types'
import { materialCarreraLabel } from '@/lib/material-labels'

export function ModeracionQueue() {
  const router = useRouter()
  const [items, setItems] = useState<MaterialRead[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, start] = useTransition()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/moderation/queue', { cache: 'no-store' })
      if (!res.ok) {
        toast.error('No pudimos cargar la cola de moderación')
        return
      }
      setItems((await res.json()) as MaterialRead[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const act = (id: string, action: 'approve' | 'reject') => {
    start(async () => {
      const res = await fetch(`/api/moderation/${id}/${action}`, { method: 'POST' })
      if (!res.ok) {
        toast.error(action === 'approve' ? 'No se pudo aprobar' : 'No se pudo rechazar')
        return
      }
      toast.success(action === 'approve' ? 'Material aprobado' : 'Material rechazado')
      await load()
      router.refresh()
    })
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando cola…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No hay materiales en cuarentena.
      </p>
    )
  }

  return (
    <ul className="space-y-4">
      {items.map((m) => (
        <li
          key={m.id}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 className="font-serif text-base font-semibold text-navy">{m.titulo}</h2>
            <p className="text-xs text-muted-foreground">
              {materialCarreraLabel(m.carrera)} · {m.tipo_archivo.toUpperCase()} · {m.status}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => act(m.id, 'approve')}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Aprobar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => act(m.id, 'reject')}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-destructive/40 px-4 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Rechazar
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
