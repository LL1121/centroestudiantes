'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import {
  COPYRIGHT_REPORT_REASONS,
  type CopyrightReportReason,
} from '@/lib/copyright'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  materialId: string
  materialTitle: string
}

export function CopyrightReportDialog({ materialId, materialTitle }: Props) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [reason, setReason] = useState<CopyrightReportReason>('sin_autorizacion')
  const [details, setDetails] = useState('')
  const [pending, start] = useTransition()

  const reset = () => {
    setEmail('')
    setName('')
    setReason('sin_autorizacion')
    setDetails('')
  }

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (details.trim().length < 20) {
      toast.error('Describí el reclamo con al menos 20 caracteres.')
      return
    }

    start(async () => {
      const res = await fetch('/api/copyright/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: materialId,
          reporter_email: email.trim(),
          reporter_name: name.trim() || null,
          reason,
          details: details.trim(),
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string }
        toast.error(body.detail ?? 'No pudimos enviar el reclamo.')
        return
      }
      toast.success(
        'Reclamo recibido. El material fue puesto en revisión mientras lo evaluamos.',
      )
      setOpen(false)
      reset()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-destructive hover:underline"
      >
        <AlertTriangle className="h-3 w-3" aria-hidden />
        Reportar por derechos de autor
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Reclamo de derechos de autor</DialogTitle>
              <DialogDescription>
                Material: <strong>{materialTitle}</strong>. Si sos titular de derechos o
                representante autorizado, completá este formulario. El material quedará en
                revisión de inmediato.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-3">
              <Field label="Email de contacto *" type="email" value={email} onChange={setEmail} required />
              <Field label="Nombre (opcional)" value={name} onChange={setName} />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-navy">Motivo *</span>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as CopyrightReportReason)}
                  required
                  className="block h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-navy outline-none focus:border-primary"
                >
                  {COPYRIGHT_REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-navy">Detalle del reclamo *</span>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  required
                  minLength={20}
                  rows={4}
                  placeholder="Indicá por qué considerás que este material infringe derechos de autor y cualquier referencia útil (ISBN, editorial, enlace a la obra original, etc.)."
                  className="block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-navy outline-none focus:border-primary"
                />
              </label>
            </div>

            <DialogFooter className="mt-4 flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-navy hover:bg-secondary/40"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-destructive px-4 text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-50"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Enviar reclamo
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-navy">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="block h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-navy outline-none focus:border-primary"
      />
    </label>
  )
}
