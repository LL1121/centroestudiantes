'use client'

import { Eye, EyeOff, Loader2, Video } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useChat } from '@/app/biblioteca/_components/chat-provider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { usePredictiveReading } from './predictive-reading'

interface PredictiveReadingControlProps {
  onNext: () => void
  immersive?: boolean
}

export function PredictiveReadingControl({
  onNext,
  immersive = false,
}: PredictiveReadingControlProps) {
  const { open: chatOpen } = useChat()
  const [modalOpen, setModalOpen] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const paused = chatOpen || tabHidden

  const {
    videoRef,
    status,
    calibStep,
    faceDetected,
    error,
    recalibrate,
    stop,
  } = usePredictiveReading({
    onNext,
    enabled,
    paused,
  })

  const handleActivate = () => {
    setModalOpen(false)
    setEnabled(true)
  }

  const handleDeactivate = () => {
    setEnabled(false)
    stop()
    setModalOpen(false)
  }

  const handleRecalibrate = () => {
    recalibrate()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        aria-label="Lectura predictiva"
        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border text-navy transition-colors sm:h-8 sm:w-8 ${
          enabled
            ? 'border-primary/40 bg-primary/10'
            : 'border-border bg-background hover:border-primary/40'
        } ${immersive ? 'absolute left-3 top-3 z-30 h-11 w-11 bg-card/80 backdrop-blur' : ''}`}
      >
        <Eye className="h-4 w-4" />
      </button>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lectura predictiva</DialogTitle>
            <DialogDescription>
              Usamos la cámara frontal para detectar cuándo terminás de leer una
              página. Todo el procesamiento ocurre en tu dispositivo; no
              enviamos video a ningún servidor.
            </DialogDescription>
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              <li>Podés desactivarlo en cualquier momento.</li>
              <li>
                La primera vez: calibración de 2 pasos (inicio y final del
                texto).
              </li>
            </ul>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {enabled ? (
              <>
                <button
                  type="button"
                  onClick={handleRecalibrate}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-navy hover:border-primary/40"
                >
                  Recalibrar
                </button>
                <button
                  type="button"
                  onClick={handleDeactivate}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-destructive px-4 text-sm font-semibold text-white hover:bg-destructive/90"
                >
                  <EyeOff className="h-4 w-4" />
                  Desactivar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleActivate}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Video className="h-4 w-4" />
                Activar lectura predictiva
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {enabled && (
        <PredictiveOverlay
          videoRef={videoRef}
          status={status}
          calibStep={calibStep}
          faceDetected={faceDetected}
          error={error}
          onDisable={handleDeactivate}
        />
      )}
    </>
  )
}

interface OverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  status: string
  calibStep: 'top' | 'bottom' | null
  faceDetected: boolean
  error: string | null
  onDisable: () => void
}

function PredictiveOverlay({
  videoRef,
  status,
  calibStep,
  faceDetected,
  error,
  onDisable,
}: OverlayProps) {
  const showPreview =
    (status === 'active' || status === 'paused') && !error

  return (
    <div className="pointer-events-none fixed bottom-20 left-3 z-50 flex flex-col gap-2 sm:bottom-6 sm:left-4">
      {status === 'calibrating' && calibStep && (
        <div className="pointer-events-auto max-w-[220px] rounded-xl bg-navy/90 px-3 py-2 text-xs text-white shadow-lg backdrop-blur">
          <p className="font-semibold">
            {calibStep === 'top'
              ? 'Mirá el inicio del texto'
              : 'Mirá el final del texto'}
          </p>
          <p className="mt-1 text-white/80">Mantené la mirada 2 segundos…</p>
        </div>
      )}

      {status === 'loading' && (
        <div className="flex items-center gap-2 rounded-xl bg-navy/90 px-3 py-2 text-xs text-white">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Iniciando cámara…
        </div>
      )}

      {error && (
        <div className="pointer-events-auto max-w-[240px] rounded-xl bg-destructive/90 px-3 py-2 text-xs text-white">
          {error}
          <button
            type="button"
            onClick={onDisable}
            className="mt-1 block underline"
          >
            Cerrar
          </button>
        </div>
      )}

      <div
        className={
          showPreview
            ? 'pointer-events-auto flex items-center gap-2 rounded-xl bg-navy/85 p-1.5 shadow-lg backdrop-blur'
            : 'fixed h-px w-px overflow-hidden opacity-0'
        }
      >
        <video
          ref={videoRef}
          muted
          playsInline
          className={
            showPreview
              ? 'h-12 w-16 -scale-x-100 rounded-lg object-cover'
              : 'h-px w-px'
          }
          aria-hidden
        />
        {showPreview && (
          <>
            <div className="text-[10px] text-white">
              <p className="font-medium">
                {status === 'paused' ? 'Pausado' : 'Lectura predictiva'}
              </p>
              <p className={faceDetected ? 'text-green-300' : 'text-amber-200'}>
                {faceDetected ? 'Rostro detectado' : 'Buscando rostro…'}
              </p>
            </div>
            <button
              type="button"
              onClick={onDisable}
              className="ml-1 rounded-lg p-1 text-white/80 hover:bg-white/10"
              aria-label="Desactivar lectura predictiva"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
