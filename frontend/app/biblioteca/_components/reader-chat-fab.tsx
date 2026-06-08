'use client'

import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'

import { bibHref } from '@/lib/biblioteca-path'
import { cn } from '@/lib/utils'

import { useChat } from './chat-provider'

interface Props {
  materialId: string
  titulo: string
  isGuest: boolean
}

export function ReaderChatFab({ materialId, titulo, isGuest }: Props) {
  const router = useRouter()
  const { openChat } = useChat()

  const onClick = () => {
    if (isGuest) {
      const redirect = bibHref(`/biblioteca/materiales/${materialId}/leer`)
      router.push(`${bibHref('/biblioteca/login')}?redirect=${encodeURIComponent(redirect)}`)
      return
    }
    openChat({ focus: 'local', materialId, titulo })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Consultar con el asistente sobre ${titulo}`}
      className={cn(
        'fixed right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-primary/30 transition-all',
        'bg-gradient-to-br from-primary to-celeste-light text-primary-foreground',
        'hover:scale-105 hover:shadow-primary/40 active:scale-95',
        'bottom-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))]',
      )}
    >
      <Sparkles className="h-6 w-6" aria-hidden />
    </button>
  )
}
