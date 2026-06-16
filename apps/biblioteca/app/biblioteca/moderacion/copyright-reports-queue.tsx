'use client'

import { Check, Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { CopyrightReportRead } from '@/lib/api/types'
import { copyrightReasonLabel } from '@/lib/copyright'
import { materialCarreraLabel } from '@/lib/material-labels'

export function CopyrightReportsQueue() {
  const router = useRouter()
  const [items, setItems] = useState<CopyrightReportRead[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, start] = useTransition()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/copyright/reports', { cache: 'no-store' })
      if (!res.ok) {
        toast.error('No pudimos cargar los reclamos de copyright')
        return
      }
      setItems((await res.json()) as CopyrightReportRead[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const act = (id: string, action: 'dismiss' | 'uphold') => {
    start(async () => {
      const res = await fetch(`/api/copyright/reports/${id}/${action}`, { method: 'POST' })
      if (!res.ok) {
        toast.error(action === 'dismiss' ? 'No se pudo rechazar el reclamo' : 'No se pudo acoger el reclamo')
        return
      }
      toast.success(
        action === 'dismiss'
          ? 'Reclamo rechazado; material rehabilitado'
          : 'Reclamo acogido; material retirado',
      )
      await load()
      router.refresh()
    })
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando reclamos…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No hay reclamos de copyright pendientes.
      </p>
    )
  }

  return (
    <ul className="space-y-4">
      {items.map((report) => (
        <li
          key={report.id}
          className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <h2 className="font-serif text-base font-semibold text-navy">
              {report.material?.titulo ?? 'Material desconocido'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {copyrightReasonLabel(report.reason)} · {report.reporter_email}
              {report.reporter_name ? ` (${report.reporter_name})` : ''}
            </p>
            {report.material && (
              <p className="text-xs text-muted-foreground">
                {materialCarreraLabel(report.material.carrera)} · {report.material.status}
              </p>
            )}
            <p className="text-sm text-navy/80">{report.details}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => act(report.id, 'dismiss')}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Rechazar reclamo
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => act(report.id, 'uphold')}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-destructive/40 px-4 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Retirar material
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
