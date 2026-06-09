'use client'

/**
 * Lector Manos Libres (arquitectura híbrida).
 *
 * Un benchmark inicial (<200ms) decide la modalidad:
 *  - MODO A (gama alta): seguimiento ocular con WebGazer.js + filtro de Kalman.
 *  - MODO B (gama baja / fallback): control por inclinación de cabeza.
 *  - Fallback de emergencia: scroll automático (teleprompter) si la cámara
 *    está bloqueada o los FPS se degradan.
 *
 * Todo el procesamiento es local; nunca se envía video ni imágenes al servidor.
 * Expone callbacks onNext()/onPrev() y se integra en los visores PDF/EPUB.
 */
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Gauge,
  Loader2,
  Minus,
  Pause,
  Play,
  Plus,
  ScanEye,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { useChat } from '@/app/biblioteca/_components/chat-provider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { runPerformanceBenchmark, type BenchmarkResult } from './manos-libres/benchmark'
import { startEyeTracking, type EyeTrackingHandle } from './manos-libres/use-eye-tracking'
import { startHeadTilt, type HeadTiltHandle } from './manos-libres/use-head-tilt'
import { useAutoScroll } from './manos-libres/use-auto-scroll'
import { ReaderBodyPortal } from './reader-controls'

type Mode = 'eye' | 'head' | 'scroll' | null
type Status =
  | 'idle'
  | 'benchmarking'
  | 'starting'
  | 'eye'
  | 'head'
  | 'scroll'
  | 'error'

interface Options {
  onNext: () => void
  onPrev: () => void
  /** Contenedor desplazable para el fallback de scroll (opcional). */
  scrollRef?: React.RefObject<HTMLElement | null>
}

interface ActiveHandle {
  stop: () => void
  setPaused: (paused: boolean) => void
}

export interface LectorInteligenteController {
  enabled: boolean
  status: Status
  mode: Mode
  openPanel: () => void
  node: ReactNode
}

function describeCameraError(err: unknown): string {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'La cámara necesita HTTPS. Activamos el modo de scroll automático.'
  }
  if (err instanceof DOMException && err.name === 'NotAllowedError') {
    return 'Cámara bloqueada. Activamos el modo de scroll automático.'
  }
  return 'No pudimos usar la cámara. Activamos el modo de scroll automático.'
}

export function useLectorInteligente({
  onNext,
  onPrev,
  scrollRef,
}: Options): LectorInteligenteController {
  const { open: chatOpen } = useChat()
  const [tabHidden, setTabHidden] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [mode, setMode] = useState<Mode>(null)
  const [error, setError] = useState<string | null>(null)
  const [bench, setBench] = useState<BenchmarkResult | null>(null)

  const handleRef = useRef<ActiveHandle | null>(null)
  const startTokenRef = useRef(0)
  const auto = useAutoScroll({ onNext, scrollRef })
  const autoStartRef = useRef(auto.start)
  autoStartRef.current = auto.start
  const autoStopRef = useRef(auto.stop)
  autoStopRef.current = auto.stop

  const paused = chatOpen || tabHidden
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const onNextRef = useRef(onNext)
  onNextRef.current = onNext

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Pausa del handle activo (ojo/cabeza).
  useEffect(() => {
    handleRef.current?.setPaused(paused)
  }, [paused])

  const stopAll = useCallback(() => {
    startTokenRef.current++
    handleRef.current?.stop()
    handleRef.current = null
    autoStopRef.current()
  }, [])

  const switchToScroll = useCallback((message?: string) => {
    handleRef.current?.stop()
    handleRef.current = null
    if (message) setError(message)
    setMode('scroll')
    setStatus('scroll')
    if (!pausedRef.current) autoStartRef.current()
  }, [])

  const startSystem = useCallback(async () => {
    const token = ++startTokenRef.current
    setError(null)
    setStatus('benchmarking')
    // Cedemos un frame para que la UI pinte el estado antes del stress test.
    await new Promise((r) => window.setTimeout(r, 30))
    if (token !== startTokenRef.current) return

    const result = runPerformanceBenchmark()
    setBench(result)
    setStatus('starting')

    // MODO A: seguimiento ocular (solo en gama alta).
    if (result.highEnd) {
      try {
        const handle: EyeTrackingHandle = await startEyeTracking({
          onNext: () => onNextRef.current(),
        })
        if (token !== startTokenRef.current) {
          handle.stop()
          return
        }
        handleRef.current = handle
        handle.setPaused(pausedRef.current)
        setMode('eye')
        setStatus('eye')
        return
      } catch {
        if (token !== startTokenRef.current) return
        // Cae al Modo B.
      }
    }

    // MODO B: inclinación de cabeza.
    try {
      const handle: HeadTiltHandle = await startHeadTilt({
        onNext: () => onNextRef.current(),
        onDegraded: () => switchToScroll('Rendimiento bajo: scroll automático.'),
      })
      if (token !== startTokenRef.current) {
        handle.stop()
        return
      }
      handleRef.current = handle
      handle.setPaused(pausedRef.current)
      setMode('head')
      setStatus('head')
    } catch (err) {
      if (token !== startTokenRef.current) return
      switchToScroll(describeCameraError(err))
    }
  }, [switchToScroll])

  // Pausa/reanuda el scroll automático según foco.
  useEffect(() => {
    if (status !== 'scroll') return
    if (paused) autoStopRef.current()
    else autoStartRef.current()
  }, [paused, status])

  useEffect(() => () => stopAll(), [stopAll])

  const handleActivate = useCallback(() => {
    setModalOpen(false)
    setEnabled(true)
    void startSystem()
  }, [startSystem])

  const handleDeactivate = useCallback(() => {
    stopAll()
    setEnabled(false)
    setMode(null)
    setStatus('idle')
    setError(null)
    setModalOpen(false)
  }, [stopAll])

  const openPanel = useCallback(() => setModalOpen(true), [])

  const node = (
    <ReaderBodyPortal>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent elevated className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lectura manos libres</DialogTitle>
            <DialogDescription>
              Pasamos de página sin tocar la pantalla. Según la potencia de tu
              dispositivo usamos seguimiento ocular o control por movimiento de
              cabeza; si no hay cámara, scroll automático. Todo el procesamiento
              ocurre en tu dispositivo: no enviamos video a ningún servidor.
            </DialogDescription>
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              <li>Los modos con cámara requieren conexión segura (HTTPS).</li>
              <li>Podés desactivarlo en cualquier momento.</li>
            </ul>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {enabled ? (
              <button
                type="button"
                onClick={handleDeactivate}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-destructive px-4 text-sm font-semibold text-white hover:bg-destructive/90"
              >
                <EyeOff className="h-4 w-4" />
                Desactivar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleActivate}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <ScanEye className="h-4 w-4" />
                Activar lectura manos libres
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {enabled && (
        <StatusOverlay
          status={status}
          mode={mode}
          error={error}
          paused={paused}
          bench={bench}
          scroll={{
            running: auto.running,
            speed: auto.speed,
            toggle: auto.toggle,
            faster: auto.faster,
            slower: auto.slower,
          }}
          onPrev={onPrev}
          onNext={onNext}
          onDisable={handleDeactivate}
        />
      )}
    </ReaderBodyPortal>
  )

  return useMemo(
    () => ({ enabled, status, mode, openPanel, node }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, status, mode, node],
  )
}

interface StatusOverlayProps {
  status: Status
  mode: Mode
  error: string | null
  paused: boolean
  bench: BenchmarkResult | null
  scroll: {
    running: boolean
    speed: number
    toggle: () => void
    faster: () => void
    slower: () => void
  }
  onPrev: () => void
  onNext: () => void
  onDisable: () => void
}

function StatusOverlay({
  status,
  mode,
  error,
  paused,
  scroll,
  onPrev,
  onNext,
  onDisable,
}: StatusOverlayProps) {
  const label =
    status === 'benchmarking'
      ? 'Midiendo rendimiento…'
      : status === 'starting'
        ? 'Iniciando…'
        : mode === 'eye'
          ? 'Seguimiento ocular'
          : mode === 'head'
            ? 'Control por cabeza'
            : mode === 'scroll'
              ? 'Scroll automático'
              : 'Lectura manos libres'

  const busy = status === 'benchmarking' || status === 'starting'

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-100 flex max-w-[min(92vw,340px)] flex-col gap-2">
      {error && (
        <div className="pointer-events-auto rounded-xl bg-amber-500/95 px-3 py-2 text-xs font-medium text-navy shadow-lg">
          {error}
        </div>
      )}

      {status === 'scroll' ? (
        <TeleprompterPanel
          running={scroll.running}
          speed={scroll.speed}
          paused={paused}
          onToggle={scroll.toggle}
          onFaster={scroll.faster}
          onSlower={scroll.slower}
          onPrev={onPrev}
          onNext={onNext}
          onDisable={onDisable}
        />
      ) : (
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-navy/90 px-3 py-2 text-xs text-white shadow-lg backdrop-blur">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <ScanEye className="h-4 w-4 text-primary" />
          )}
          <div className="leading-tight">
            <p className="font-semibold">{label}</p>
            <p className="text-[10px] text-white/70">
              {busy
                ? 'Un momento…'
                : paused
                  ? 'En pausa'
                  : mode === 'eye'
                    ? 'Mirá el borde inferior para avanzar'
                    : 'Incliná la cabeza para avanzar'}
            </p>
          </div>
          <button
            type="button"
            onClick={onDisable}
            aria-label="Desactivar lectura manos libres"
            className="ml-1 rounded-lg p-1 text-white/80 hover:bg-white/10"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

interface TeleprompterPanelProps {
  running: boolean
  speed: number
  paused: boolean
  onToggle: () => void
  onFaster: () => void
  onSlower: () => void
  onPrev: () => void
  onNext: () => void
  onDisable: () => void
}

function TeleprompterPanel({
  running,
  speed,
  paused,
  onToggle,
  onFaster,
  onSlower,
  onPrev,
  onNext,
  onDisable,
}: TeleprompterPanelProps) {
  return (
    <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl bg-navy/95 p-3 text-white shadow-2xl ring-1 ring-primary/30 backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <Gauge className="h-4 w-4 text-primary" />
        Scroll automático
        {paused && <span className="text-[10px] text-amber-300">· en pausa</span>}
        <button
          type="button"
          onClick={onDisable}
          aria-label="Desactivar"
          className="ml-auto rounded-lg p-1 text-white/80 hover:bg-white/10"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-1">
        <PanelButton onClick={onPrev} aria-label="Página anterior">
          <ChevronLeft className="h-4 w-4" />
        </PanelButton>
        <PanelButton onClick={onSlower} aria-label="Más lento">
          <Minus className="h-4 w-4" />
        </PanelButton>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? 'Pausar' : 'Reanudar'}
        </button>
        <PanelButton onClick={onFaster} aria-label="Más rápido">
          <Plus className="h-4 w-4" />
        </PanelButton>
        <PanelButton onClick={onNext} aria-label="Página siguiente">
          <ChevronRight className="h-4 w-4" />
        </PanelButton>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-white/60">Velocidad</span>
        <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(speed / 10) * 100}%` }}
          />
        </div>
        <span className="w-6 text-right text-[10px] tabular-nums text-white/80">
          {speed}
        </span>
      </div>
    </div>
  )
}

function PanelButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
    >
      {children}
    </button>
  )
}

interface TriggerProps {
  onClick: () => void
  active: boolean
  immersive?: boolean
}

/** Botón con ícono para abrir el panel de lectura manos libres. */
export function LectorTriggerButton({
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
          aria-label="Lectura manos libres"
          className={`fixed left-3 top-3 z-100 inline-flex h-11 w-11 items-center justify-center rounded-full text-navy shadow-lg ring-1 ring-border backdrop-blur transition ${
            active ? 'bg-primary/20 text-primary' : 'bg-card/80 hover:bg-card'
          }`}
        >
          <ScanEye className="h-5 w-5" />
        </button>
      </ReaderBodyPortal>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Lectura manos libres"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border text-navy transition-colors sm:h-8 sm:w-8 ${
        active
          ? 'border-primary/40 bg-primary/10'
          : 'border-border bg-background hover:border-primary/40'
      }`}
    >
      <ScanEye className="h-4 w-4" />
    </button>
  )
}
