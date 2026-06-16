'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface Props {
  /** Si hay materiales en cola o procesándose, revalida el catálogo cada pocos segundos. */
  active: boolean
  intervalMs?: number
}

/**
 * Refresca la página de materiales (Server Components) mientras algún
 * archivo sigue en pending/processing. Solo corre con la pestaña visible
 * para no martillar el backend cuando el usuario tiene la app en background.
 */
export function MaterialsAutoRefresh({ active, intervalMs = 8000 }: Props) {
  const router = useRouter()

  useEffect(() => {
    if (!active) return

    let id: number | null = null

    const start = () => {
      if (id !== null) return
      id = window.setInterval(() => router.refresh(), intervalMs)
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
  }, [active, intervalMs, router])

  return null
}
