'use client'

import { Eye, EyeOff, Loader2, Video } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { useChat } from '@/app/biblioteca/_components/chat-provider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { ReaderBodyPortal } from './reader-controls'
import { CALIB_SAMPLE_MS } from './predictive-reading-utils'
import { usePredictiveReading } from './predictive-reading'

interface ControllerOptions {
  onNext: () => void
}

interface PredictiveController {
  enabled: boolean
  status: string
  openModal: () => void
  /** Modal + overlays. Montalo una sola vez por visor. */
  node: ReactNode
}

/**
 * Controla la lectura predictiva con UNA sola instancia de cámara, de modo que
 * entrar/salir de pantalla completa no reinicie la cámara ni pierda el estado.
 * Renderizá `controller.node` una vez y usá `openModal`/`enabled` para el botón.
 */
export function usePredictiveController({
  onNext,
}: ControllerOptions): PredictiveController {
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
    capturing,
    captureProgress,
    calibHint,
    beginCapture,
    recalibrate,
    stop,
  } = usePredictiveReading({ onNext, enabled, paused })

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
    setModalOpen(false)
    recalibrate()
  }

  const node = (
    <ReaderBodyPortal>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent elevated className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lectura predictiva</DialogTitle>
            <DialogDescription>
              Usamos la cámara frontal para detectar cuándo terminás de leer una
              página. Todo el procesamiento ocurre en tu dispositivo; no
              enviamos video a ningún servidor.
            </DialogDescription>
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              <li>Necesita una conexión segura (HTTPS) para usar la cámara.</li>
              <li>Podés desactivarlo en cualquier momento.</li>
              <li>
                La primera vez: calibración guiada de 2 pasos (mirás el inicio y
                el final del texto).
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
        <>
          {/* Video oculto: fuente de frames para MediaPipe (siempre montado). */}
          <video
            ref={videoRef}
            muted
            playsInline
            aria-hidden
            className={
              status === 'active' || status === 'paused'
                ? 'fixed bottom-3 left-3 z-90 h-12 w-16 -scale-x-100 rounded-lg object-cover shadow-lg ring-1 ring-white/20'
                : 'pointer-events-none fixed h-px w-px opacity-0'
            }
          />

          {status === 'calibrating' && calibStep && (
            <CalibrationOverlay
              step={calibStep}
              capturing={capturing}
              progress={captureProgress}
              faceDetected={faceDetected}
              hint={calibHint}
              onBegin={beginCapture}
              onCancel={handleDeactivate}
            />
          )}

          <PredictiveStatusBadge
            status={status}
            faceDetected={faceDetected}
            error={error}
            onDisable={handleDeactivate}
          />
        </>
      )}
    </ReaderBodyPortal>
  )

  return useMemo(
    () => ({ enabled, status, openModal: () => setModalOpen(true), node }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, status, node],
  )
}

interface TriggerProps {
  onClick: () => void
  active: boolean
  immersive?: boolean
}

/** Botón con ícono de ojo para abrir el modal de lectura predictiva. */
export function PredictiveTriggerButton({
  onClick,
  active,
  immersive = false,
}: TriggerProps) {
  if (immersive) {
    return (
      <ReaderBodyPortal>
        <button
          type="button"
          onClick={onClick}
          aria-label="Lectura predictiva"
          className={`fixed left-3 top-3 z-100 inline-flex h-11 w-11 items-center justify-center rounded-full text-navy shadow-lg ring-1 ring-border backdrop-blur transition ${
            active ? 'bg-primary/20 text-primary' : 'bg-card/80 hover:bg-card'
          }`}
        >
          <Eye className="h-5 w-5" />
        </button>
      </ReaderBodyPortal>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Lectura predictiva"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border text-navy transition-colors sm:h-8 sm:w-8 ${
        active
          ? 'border-primary/40 bg-primary/10'
          : 'border-border bg-background hover:border-primary/40'
      }`}
    >
      <Eye className="h-4 w-4" />
    </button>
  )
}

interface CalibrationOverlayProps {
  step: 'top' | 'bottom'
  capturing: boolean
  progress: number
  faceDetected: boolean
  hint: string | null
  onBegin: () => void
  onCancel: () => void
}

function CalibrationOverlay({
  step,
  capturing,
  progress,
  faceDetected,
  hint,
  onBegin,
  onCancel,
}: CalibrationOverlayProps) {
  const isTop = step === 'top'
  const secondsLeft = Math.max(
    1,
    Math.ceil(((1 - progress) * CALIB_SAMPLE_MS) / 1000),
  )

  return (
    <div className="fixed inset-0 z-110 flex flex-col">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px]" />

      {/* Zona resaltada a mirar (arriba o abajo). */}
      <div
        className={`pointer-events-none absolute left-1/2 flex w-[88%] max-w-2xl -translate-x-1/2 items-center justify-center ${
          isTop ? 'top-[7%]' : 'bottom-[7%]'
        }`}
      >
        <div
          className={`relative flex h-20 w-full items-center justify-center rounded-2xl border-4 border-dashed transition-colors sm:h-28 ${
            capturing
              ? 'animate-pulse border-primary bg-primary/25 shadow-[0_0_40px_rgba(198,161,101,0.55)]'
              : 'border-primary/80 bg-primary/15'
          }`}
        >
          {capturing ? (
            <div className="flex flex-col items-center text-white">
              <span className="text-4xl font-bold tabular-nums">
                {secondsLeft}
              </span>
              <span className="text-xs">
                {faceDetected
                  ? 'Seguí mirando acá…'
                  : 'Te perdimos, mirá la cámara'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-white">
              <Eye className="h-6 w-6" />
              <span className="text-sm font-semibold sm:text-base">
                Mirá {isTop ? 'el inicio' : 'el final'} del texto (acá)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tarjeta central con instrucciones + botón (oculta durante la captura). */}
      {!capturing && (
        <div className="relative z-10 m-auto w-[88%] max-w-sm rounded-2xl bg-card p-5 text-center shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Calibración · paso {isTop ? '1' : '2'} de 2
          </p>
          <h3 className="mt-1 text-lg font-bold text-navy">
            {isTop ? 'Zona superior' : 'Zona inferior'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Cuando toques <strong>Empezar</strong>, mirá fijo la zona resaltada{' '}
            {isTop ? 'de arriba' : 'de abajo'} unos segundos. No muevas la
            cabeza, solo los ojos.
          </p>

          <p
            className={`mt-3 text-xs font-medium ${
              faceDetected ? 'text-green-600' : 'text-amber-600'
            }`}
          >
            {faceDetected
              ? '✓ Te estamos detectando'
              : 'Acomodá tu cara frente a la cámara'}
          </p>
          {hint && <p className="mt-1 text-xs text-destructive">{hint}</p>}

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={onBegin}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Eye className="h-4 w-4" />
              Empezar
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-9 w-full items-center justify-center rounded-lg text-xs font-medium text-muted-foreground hover:text-navy"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface StatusBadgeProps {
  status: string
  faceDetected: boolean
  error: string | null
  onDisable: () => void
}

function PredictiveStatusBadge({
  status,
  faceDetected,
  error,
  onDisable,
}: StatusBadgeProps) {
  return (
    <div className="pointer-events-none fixed bottom-3 left-20 z-90 flex flex-col gap-2">
      {status === 'loading' && (
        <div className="flex items-center gap-2 rounded-xl bg-navy/90 px-3 py-2 text-xs text-white shadow-lg">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Iniciando cámara…
        </div>
      )}

      {error && (
        <div className="pointer-events-auto max-w-[260px] rounded-xl bg-destructive/95 px-3 py-2 text-xs text-white shadow-lg">
          {error}
          <button
            type="button"
            onClick={onDisable}
            className="mt-1 block font-semibold underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {(status === 'active' || status === 'paused') && !error && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-navy/85 px-2 py-1.5 text-[10px] text-white shadow-lg backdrop-blur">
          <div>
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
        </div>
      )}
    </div>
  )
}
