'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'

import { bibHref } from '@/lib/biblioteca-path'
import { cn } from '@/lib/utils'

import { useChat } from './chat-provider'

interface Props {
  isGuest: boolean
}

/**
 * Floating Action Button del asistente IA.
 * Abre el panel integrado (no redirige a otra página).
 */
export function AiFab({ isGuest }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { openChat } = useChat()

  const hideOn = ['/biblioteca/login', '/biblioteca/registro'].map(bibHref)
  if (pathname.includes('/leer')) return null
  if (hideOn.some((p) => pathname.startsWith(p))) return null

  const onClick = () => {
    if (isGuest) {
      router.push(`${bibHref('/biblioteca/login')}?redirect=${encodeURIComponent(pathname)}`)
      return
    }
    openChat({ focus: 'global' })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Asistente IA"
      className={cn(
        'fixed right-4 z-40 inline-flex items-center gap-2 rounded-full shadow-lg shadow-primary/30 transition-all',
        'bg-gradient-to-br from-primary to-celeste-light text-primary-foreground dark:from-primary dark:to-celeste',
        'hover:scale-105 hover:shadow-primary/40 active:scale-95',
        'h-14 w-14 justify-center md:h-auto md:w-auto md:px-5 md:py-3',
        'bottom-[max(5.25rem,calc(env(safe-area-inset-bottom,0px)+5.25rem))] md:bottom-6',
      )}
    >
      <span
        className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-primary/40 blur-md"
        aria-hidden
      />
      <Sparkles className="h-6 w-6 md:h-4 md:w-4" aria-hidden />
      <span className="hidden text-sm font-semibold md:inline">Asistente IA</span>
    </button>
  )
}
