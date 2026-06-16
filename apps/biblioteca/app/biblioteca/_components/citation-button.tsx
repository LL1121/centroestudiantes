'use client'

import { Copy, Loader2, Quote, X } from 'lucide-react'
import { useCallback, useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { MaterialCitationRead } from '@/lib/api/types'

interface Props {
  materialId: string
  titulo: string
}

const FIELD_LABELS: Record<string, string> = {
  autor: 'Autor',
  anio_publicacion: 'Año de publicación',
  editorial: 'Editorial',
  ciudad_publicacion: 'Ciudad',
  isbn: 'ISBN',
}

export function CitationButton({ materialId, titulo }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [saving, startSave] = useTransition()
  const [citation, setCitation] = useState<MaterialCitationRead | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})

  const loadCitation = useCallback(() => {
    start(async () => {
      try {
        const res = await fetch(`/api/materials/${materialId}/citation`, { cache: 'no-store' })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { detail?: string }
          toast.error(body.detail ?? 'No pudimos generar la cita.')
          return
        }
        const data = (await res.json()) as MaterialCitationRead
        setCitation(data)
        setDraft({})
        setOpen(true)
      } catch {
        toast.error('Error de red al generar la cita.')
      }
    })
  }, [materialId])

  const onCopy = async () => {
    if (!citation) return
    try {
      await navigator.clipboard.writeText(citation.citation_apa)
      toast.success('Cita copiada al portapapeles')
    } catch {
      toast.error('No pudimos copiar la cita')
    }
  }

  const onSaveMissing = () => {
    if (!citation?.missing_fields.length) return
    const payload: Record<string, string | number> = {}
    for (const field of citation.missing_fields) {
      const raw = draft[field]?.trim()
      if (!raw) continue
      if (field === 'anio_publicacion') {
        const year = Number.parseInt(raw, 10)
        if (Number.isNaN(year)) {
          toast.error('El año debe ser un número válido.')
          return
        }
        payload.anio_publicacion = year
      } else {
        payload[field] = raw
      }
    }
    if (Object.keys(payload).length === 0) {
      toast.error('Completá al menos un campo.')
      return
    }

    startSave(async () => {
      try {
        const patchRes = await fetch(`/api/materials/${materialId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!patchRes.ok) {
          const body = (await patchRes.json().catch(() => ({}))) as { detail?: string }
          toast.error(body.detail ?? 'No pudimos guardar los datos.')
          return
        }
        const citeRes = await fetch(`/api/materials/${materialId}/citation`, { cache: 'no-store' })
        if (!citeRes.ok) {
          toast.error('Datos guardados, pero no pudimos regenerar la cita.')
          return
        }
        const data = (await citeRes.json()) as MaterialCitationRead
        setCitation(data)
        setDraft({})
        toast.success('Metadata actualizada')
      } catch {
        toast.error('Error de red al guardar.')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={loadCitation}
        disabled={pending}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Quote className="h-3.5 w-3.5" aria-hidden />
        )}
        Citar (APA)
      </button>

      {open && citation && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={`Cita APA de ${titulo}`}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Cita APA</p>
                <p className="mt-1 text-sm font-medium text-navy">{titulo}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-navy"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 rounded-xl bg-secondary/40 p-4 text-sm leading-relaxed text-navy">
              {citation.citation_apa}
            </p>

            {citation.missing_fields.length > 0 && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-xs font-medium text-navy">
                  Completá los datos faltantes para mejorar la cita:
                </p>
                {citation.missing_fields.map((field) => (
                  <label key={field} className="block">
                    <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
                      {FIELD_LABELS[field] ?? field}
                    </span>
                    <input
                      type={field === 'anio_publicacion' ? 'number' : 'text'}
                      value={draft[field] ?? ''}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, [field]: event.target.value }))
                      }
                      disabled={saving}
                      className="block h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-navy outline-none focus:border-primary"
                      placeholder={FIELD_LABELS[field] ?? field}
                    />
                  </label>
                ))}
                <button
                  type="button"
                  onClick={onSaveMissing}
                  disabled={saving}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                  Guardar y actualizar cita
                </button>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void onCopy()}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Copy className="h-4 w-4" aria-hidden />
                Copiar cita
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-navy hover:border-primary/40"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
