'use client'

import { Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

interface Props {
  materialId: string
  titulo: string
}

/**
 * Render compuesto: icono inline en el header de la card y, cuando se
 * confirma, un overlay absoluto que cubre la card. Necesita un padre con
 * `position: relative` (el `<li>` del MaterialCard ya lo tiene).
 */
export function DeleteMaterialButton({ materialId, titulo }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [confirming, setConfirming] = useState(false)

  const onDelete = () => {
    start(async () => {
      const response = await fetch(`/api/materials/${materialId}`, { method: 'DELETE' })
      if (!response.ok && response.status !== 204) {
        const data = (await response.json().catch(() => ({}))) as { detail?: string }
        toast.error(data.detail ?? 'No pudimos eliminar el material')
        setConfirming(false)
        return
      }
      toast.success(`Material "${titulo}" eliminado`)
      setConfirming(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Eliminar ${titulo}`}
        title="Eliminar"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>

      {confirming && (
        <div
          role="alertdialog"
          aria-label="Confirmar eliminación"
          className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-card/95 p-5 backdrop-blur-sm"
        >
          <div className="w-full rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive">Eliminar material</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vas a borrar <span className="font-medium text-navy">{titulo}</span>. Esta acción es definitiva y también elimina sus embeddings del asistente IA.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-destructive px-3 text-sm font-semibold text-white transition-colors hover:bg-destructive/90 disabled:opacity-50 sm:text-xs"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Sí, eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-navy transition-colors hover:border-primary/40 disabled:opacity-50 sm:text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
