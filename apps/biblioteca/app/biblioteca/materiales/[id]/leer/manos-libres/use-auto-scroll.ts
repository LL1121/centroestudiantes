'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Fallback de emergencia: scroll automático estilo teleprompter.
 *
 * Si hay un contenedor desplazable, lo desplaza suavemente y, al llegar al
 * fondo, pasa de página con onNext(). Si no es desplazable (p. ej. EPUB
 * paginado), avanza por tiempo. Velocidad ajustable con +/-.
 */
const MIN_SPEED = 1
const MAX_SPEED = 10
const PAGE_HOLD_MS = 600

interface Options {
  onNext: () => void
  scrollRef?: React.RefObject<HTMLElement | null>
}

export function useAutoScroll({ onNext, scrollRef }: Options) {
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(4)
  const speedRef = useRef(speed)
  speedRef.current = speed
  const rafRef = useRef(0)
  const lastTickRef = useRef(0)
  const holdUntilRef = useRef(0)
  const pageAccumRef = useRef(0)

  const start = useCallback(() => setRunning(true), [])
  const stop = useCallback(() => setRunning(false), [])
  const toggle = useCallback(() => setRunning((r) => !r), [])
  const faster = useCallback(
    () => setSpeed((s) => Math.min(MAX_SPEED, s + 1)),
    [],
  )
  const slower = useCallback(
    () => setSpeed((s) => Math.max(MIN_SPEED, s - 1)),
    [],
  )

  useEffect(() => {
    if (!running) return
    lastTickRef.current = performance.now()
    pageAccumRef.current = 0

    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick)
      const dt = now - lastTickRef.current
      lastTickRef.current = now
      if (now < holdUntilRef.current) return

      const el = scrollRef?.current
      const canScroll = !!el && el.scrollHeight - el.clientHeight > 8

      if (canScroll && el) {
        el.scrollTop += (speedRef.current * dt) / 16
        const atBottom =
          el.scrollHeight - (el.scrollTop + el.clientHeight) <= 2
        if (atBottom) {
          onNext()
          holdUntilRef.current = now + PAGE_HOLD_MS
          // Tras pasar de página, volvemos arriba para leer la nueva.
          window.setTimeout(() => {
            if (scrollRef?.current) scrollRef.current.scrollTop = 0
          }, PAGE_HOLD_MS / 2)
        }
      } else {
        // Sin scroll: avanzar por tiempo (más lento cuanto menor la velocidad).
        pageAccumRef.current += dt
        const threshold = 9000 - speedRef.current * 700
        if (pageAccumRef.current >= threshold) {
          pageAccumRef.current = 0
          onNext()
          holdUntilRef.current = now + PAGE_HOLD_MS
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [running, onNext, scrollRef])

  return { running, speed, start, stop, toggle, faster, slower }
}
