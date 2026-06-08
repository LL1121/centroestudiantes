'use client'

import { ChevronLeft, ChevronRight, Minimize2 } from 'lucide-react'
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
    const touch = event.touches[0]
    if (touch) start.current = { x: touch.clientX, y: touch.clientY }
  }

  const onTouchEnd = (event: React.TouchEvent) => {
    const origin = start.current
    start.current = null
    const touch = event.changedTouches[0]
    if (!origin || !touch) return
    const dx = touch.clientX - origin.x
    const dy = touch.clientY - origin.y
    // Solo swipe claramente horizontal (no confundir con scroll vertical).
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.3) return
    if (dx < 0) onNext()
    else onPrev()
  }

  return { onTouchStart, onTouchEnd }
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
}: ReaderNavProps) {
  return (
    <>
      {immersive && (
        <>
          <button
            type="button"
            aria-label="Página anterior"
            tabIndex={-1}
            onClick={onPrev}
            className="absolute left-0 top-0 z-20 h-full w-1/4 cursor-w-resize"
          />
          <button
            type="button"
            aria-label="Página siguiente"
            tabIndex={-1}
            onClick={onNext}
            className="absolute right-0 top-0 z-20 h-full w-1/4 cursor-e-resize"
          />
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
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-full bg-navy/70 px-3 py-1 text-xs font-medium tabular-nums text-white shadow backdrop-blur">
          {pageLabel}
        </div>
      )}
    </>
  )
}
