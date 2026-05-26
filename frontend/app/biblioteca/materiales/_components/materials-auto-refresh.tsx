'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface Props {
  /** Si hay materiales en cola o procesándose, revalida el catálogo cada pocos segundos. */
  active: boolean
  intervalMs?: number
}

/**
 * Refresca la página de materiales (Server Components) sin F5 manual
 * mientras algún archivo sigue en pending/processing.
 */
export function MaterialsAutoRefresh({ active, intervalMs = 4000 }: Props) {
  const router = useRouter()

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => router.refresh(), intervalMs)
    return () => window.clearInterval(id)
  }, [active, intervalMs, router])

  return null
}
