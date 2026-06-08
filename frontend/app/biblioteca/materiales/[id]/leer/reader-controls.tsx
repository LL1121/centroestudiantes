'use client'

import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Controles de lectura compartidos por los visores (PDF / EPUB):
 * - Pantalla completa inmersiva (Fullscreen API + overlay CSS para iOS).
 * - Gestos de swipe (mobile) y teclas de flecha (desktop).
 * - Zonas táctiles en los bordes y botones flotantes grandes para el pulgar.
 *
 * Objetivo UX: que pasar de página sea un gesto natural ("mover un dedo"),
 * cómodo tanto acostado en el celu como en la compu.
 */

const SWIPE_MIN_PX = 55

interface NavHandlers {
  onPrev: () => void
  onNext: () => void
}

/** Maneja el modo inmersivo (pantalla completa) de forma robusta cross-browser. */
export function useImmersive(ref: React.RefObject<HTMLElement | null>) {
  const [immersive, setImmersive] = useState(false)

  const enter = useCallback(() => {
    setImmersive(true)
    const el = ref.current
    // Fullscreen nativo en desktop; iOS Safari lo ignora en divs y usamos
    // el overlay CSS como respaldo (de ahí el setImmersive de arriba).
    if (el?.requestFullscreen) {
      void el.requestFullscreen().catch(() => {})
    }
  }, [ref])

  const exit = useCallback(() => {
    setImmersive(false)
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  const toggle = useCallback(() => {
    if (immersive) exit()
    else enter()
  }, [immersive, enter, exit])

  // Si el usuario sale del fullscreen nativo (Esc, gesto), sincronizamos.
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setImmersive(false)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Bloquear scroll del body mientras el overlay CSS está activo.
  useEffect(() => {
    if (!immersive) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [immersive])

  // Escape para salir cuando el modo viene del overlay CSS (sin fullscreen nativo).
  useEffect(() => {
    if (!immersive) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [immersive, exit])

  return { immersive, toggle, enter, exit }
}

/** Flechas del teclado (←/→) y barra espaciadora para pasar páginas en desktop. */
export function useReaderKeys({ onPrev, onNext }: NavHandlers) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onPrev()
      } else if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPrev, onNext])
}

/** Devuelve handlers de touch para detectar swipe horizontal en un contenedor. */
export function useSwipe({ onPrev, onNext }: NavHandlers) {
  const start = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length > 1) return
    const touch = event.touches[0]
    if (touch) start.current = { x: touch.clientX, y: touch.clientY }
  }

  const onTouchEnd = (event: React.TouchEvent) => {
    if (event.touches.length > 0) return
    const origin = start.current
    start.current = null
    const touch = event.changedTouches[0]
    if (!origin || !touch) return
    const dx = touch.clientX - origin.x
    const dy = touch.clientY - origin.y
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.3) return
    if (dx < 0) onNext()
    else onPrev()
  }

  return { onTouchStart, onTouchEnd }
}

function touchDistance(touches: React.TouchList | TouchList): number {
  if (touches.length < 2) return 0
  const a = touches[0]!
  const b = touches[1]!
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

interface ZoomGestureOptions {
  scale: number
  onScaleChange: (next: number) => void
  minScale?: number
  maxScale?: number
  onFit?: () => void
  /**
   * Si devuelve false, no se cambia de página con swipe horizontal (p. ej.
   * cuando la hoja es más ancha que la pantalla y el usuario está desplazando
   * para leer). Por defecto siempre permite el swipe.
   */
  allowSwipe?: () => boolean
}

/** Swipe + pinch-to-zoom + doble tap para ajustar, en un solo handler. */
export function useReaderTouchGestures(
  nav: NavHandlers,
  zoom?: ZoomGestureOptions,
) {
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null)
  const lastTap = useRef(0)
  const pinching = useRef(false)

  const minScale = zoom?.minScale ?? 0.5
  const maxScale = zoom?.maxScale ?? 3

  const onTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length === 2 && zoom) {
      pinching.current = true
      swipeStart.current = null
      pinchStart.current = {
        distance: touchDistance(event.touches),
        scale: zoom.scale,
      }
      return
    }
    if (event.touches.length === 1) {
      const touch = event.touches[0]
      if (touch) swipeStart.current = { x: touch.clientX, y: touch.clientY }
    }
  }

  const onTouchMove = (event: React.TouchEvent) => {
    if (event.touches.length === 2 && pinchStart.current && zoom) {
      event.preventDefault()
      const dist = touchDistance(event.touches)
      if (dist <= 0) return
      const ratio = dist / pinchStart.current.distance
      const next = Math.min(
        maxScale,
        Math.max(minScale, +(pinchStart.current.scale * ratio).toFixed(2)),
      )
      zoom.onScaleChange(next)
    }
  }

  const onTouchEnd = (event: React.TouchEvent) => {
    if (event.touches.length >= 2) return
    if (event.touches.length === 1) {
      pinchStart.current = null
      pinching.current = false
      return
    }

    pinchStart.current = null
    const wasPinching = pinching.current
    pinching.current = false
    if (wasPinching) return

    const now = Date.now()
    if (zoom?.onFit && now - lastTap.current < 320) {
      lastTap.current = 0
      zoom.onFit()
      swipeStart.current = null
      return
    }
    lastTap.current = now

    const origin = swipeStart.current
    swipeStart.current = null
    const touch = event.changedTouches[0]
    if (!origin || !touch) return
    if (zoom?.allowSwipe && !zoom.allowSwipe()) return
    const dx = touch.clientX - origin.x
    const dy = touch.clientY - origin.y
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.3) return
    if (dx < 0) nav.onNext()
    else nav.onPrev()
  }

  return { onTouchStart, onTouchMove, onTouchEnd }
}

/**
 * Detecta si un contenedor tiene scroll horizontal (la hoja es más ancha que la
 * pantalla). Sirve para no cambiar de página al desplazar para leer.
 */
export function useHorizontalOverflow(
  ref: React.RefObject<HTMLElement | null>,
  deps: React.DependencyList = [],
) {
  const [pannable, setPannable] = useState(false)
  const pannableRef = useRef(false)

  const set = useCallback((v: boolean) => {
    pannableRef.current = v
    setPannable(v)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => set(el.scrollWidth - el.clientWidth > 4)
    check()
    // Reintento corto: el layout/render del PDF puede llegar un frame tarde.
    const t = window.setTimeout(check, 120)
    const observer = new ResizeObserver(check)
    observer.observe(el)
    el.addEventListener('scroll', check, { passive: true })
    return () => {
      window.clearTimeout(t)
      observer.disconnect()
      el.removeEventListener('scroll', check)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, set, ...deps])

  return { pannable, pannableRef }
}

interface ReaderZoomControlsProps {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  visible?: boolean
}

/**
 * Controles flotantes de zoom: pill horizontal abajo-centro para no solaparse
 * con los chevrons de navegación (que van al centro de los lados).
 */
export function ReaderZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onFit,
  visible = true,
}: ReaderZoomControlsProps) {
  if (!visible) return null
  return (
    <div className="absolute bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-navy/80 p-1 shadow-lg backdrop-blur">
      <ZoomButton onClick={onZoomOut} aria-label="Reducir">
        <ZoomOut className="h-4 w-4" />
      </ZoomButton>
      <button
        type="button"
        onClick={onFit}
        aria-label="Ajustar a pantalla"
        className="min-w-12 rounded-full px-2 py-1 text-xs font-semibold tabular-nums text-white transition hover:bg-white/15"
      >
        {Math.round(scale * 100)}%
      </button>
      <ZoomButton onClick={onZoomIn} aria-label="Ampliar">
        <ZoomIn className="h-4 w-4" />
      </ZoomButton>
      <ZoomButton onClick={onFit} aria-label="Ajustar a pantalla">
        <Maximize2 className="h-4 w-4" />
      </ZoomButton>
    </div>
  )
}

function ZoomButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/15 ${className}`}
    >
      {children}
    </button>
  )
}

/** Observa tamaño del contenedor; fuerza recálculo en orientationchange. */
export function useContainerSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState<ContainerSize | null>(null)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      setSize({ width: rect.width, height: rect.height })
    }
  }, [ref])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    const observer = new ResizeObserver(() => measure())
    observer.observe(el)
    const onOrient = () => window.setTimeout(measure, 150)
    window.addEventListener('orientationchange', onOrient)
    window.addEventListener('resize', onOrient)
    return () => {
      observer.disconnect()
      window.removeEventListener('orientationchange', onOrient)
      window.removeEventListener('resize', onOrient)
    }
  }, [ref, measure])

  return size
}

interface ContainerSize {
  width: number
  height: number
}

/**
 * Adjunta detección de swipe a un `Document` (p. ej. el iframe del EPUB, cuyos
 * eventos no llegan a React). Devuelve una función de limpieza.
 */
export function attachSwipe(
  doc: Document,
  { onPrev, onNext }: NavHandlers,
): () => void {
  let sx = 0
  let sy = 0
  const onStart = (event: TouchEvent) => {
    const touch = event.touches[0]
    if (touch) {
      sx = touch.clientX
      sy = touch.clientY
    }
  }
  const onEnd = (event: TouchEvent) => {
    const touch = event.changedTouches[0]
    if (!touch) return
    const dx = touch.clientX - sx
    const dy = touch.clientY - sy
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.3) return
    if (dx < 0) onNext()
    else onPrev()
  }
  doc.addEventListener('touchstart', onStart, { passive: true })
  doc.addEventListener('touchend', onEnd, { passive: true })
  return () => {
    doc.removeEventListener('touchstart', onStart)
    doc.removeEventListener('touchend', onEnd)
  }
}

interface ReaderNavProps extends NavHandlers {
  immersive: boolean
  onExit: () => void
  canPrev?: boolean
  canNext?: boolean
  pageLabel?: string
  /** Si la hoja se puede desplazar en horizontal, desactivamos las zonas táctiles
   *  de borde para no cambiar de página al leer arrastrando. */
  pannable?: boolean
}

/**
 * Capa de controles superpuesta sobre el contenido. Debe montarse dentro de un
 * contenedor `relative`. Incluye botones flotantes, indicador de página y
 * (en modo inmersivo) zonas táctiles en los bordes + botón de salida.
 */
export function ReaderNav({
  onPrev,
  onNext,
  immersive,
  onExit,
  canPrev = true,
  canNext = true,
  pageLabel,
  pannable = false,
}: ReaderNavProps) {
  return (
    <>
      {immersive && (
        <>
          {!pannable && (
            <>
              <button
                type="button"
                aria-label="Página anterior"
                tabIndex={-1}
                onClick={onPrev}
                className="absolute left-0 top-0 z-20 h-full w-1/5 cursor-w-resize"
              />
              <button
                type="button"
                aria-label="Página siguiente"
                tabIndex={-1}
                onClick={onNext}
                className="absolute right-0 top-0 z-20 h-full w-1/5 cursor-e-resize"
              />
            </>
          )}
          <button
            type="button"
            aria-label="Salir de pantalla completa"
            onClick={onExit}
            className="absolute right-3 top-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full bg-navy/70 text-white shadow-lg backdrop-blur transition hover:bg-navy"
          >
            <Minimize2 className="h-5 w-5" />
          </button>
        </>
      )}

      <button
        type="button"
        aria-label="Página anterior"
        onClick={onPrev}
        disabled={!canPrev}
        className="absolute left-2 top-1/2 z-30 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-card/80 text-navy shadow-lg ring-1 ring-border backdrop-blur transition hover:bg-card disabled:pointer-events-none disabled:opacity-0 sm:left-3"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        type="button"
        aria-label="Página siguiente"
        onClick={onNext}
        disabled={!canNext}
        className="absolute right-2 top-1/2 z-30 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-card/80 text-navy shadow-lg ring-1 ring-border backdrop-blur transition hover:bg-card disabled:pointer-events-none disabled:opacity-0 sm:right-3"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {pageLabel && (
        <div
          className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 rounded-full bg-navy/70 px-3 py-1 text-xs font-medium tabular-nums text-white shadow backdrop-blur ${
            immersive ? 'top-3' : 'bottom-3'
          }`}
        >
          {pageLabel}
        </div>
      )}
    </>
  )
}
