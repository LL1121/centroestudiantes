'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface Props {
  /** Si hay materiales en cola o procesándose, revalida el catálogo periódicamente. */
  active: boolean
  intervalMs?: number
  /** Corta el polling tras N refrescos para no spamear si el worker quedó trabado. */
  maxRefreshes?: number
}

/**
 * Refresca la página de materiales (Server Components) mientras algún
 * archivo sigue en pending/processing. Solo corre con la pestaña visible
 * para no martillar el backend cuando el usuario tiene la app en background.
 */
export function MaterialsAutoRefresh({
  active,
  intervalMs = 20_000,
  maxRefreshes = 30,
}: Props) {
  const router = useRouter()

  useEffect(() => {
    if (!active) return

    let id: number | null = null
    let refreshCount = 0

    const tick = () => {
      if (refreshCount >= maxRefreshes) {
        stop()
        return
      }
      refreshCount += 1
      router.refresh()
    }

    const start = () => {
      if (id !== null) return
      id = window.setInterval(tick, intervalMs)
    }
    const stop = () => {
      if (id === null) return
      window.clearInterval(id)
      id = null
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start()
      else stop()
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active, intervalMs, maxRefreshes, router])

  return null
}
