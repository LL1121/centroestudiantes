'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

import { ChatShell } from './chat-shell'
import { useChat } from './chat-provider'

export function ChatPanel() {
  const { open, focus, materialId, materialTitulo, closeChat } = useChat()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeChat()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, closeChat])

  if (!open) return null

  const shellKey = `${focus}-${materialId ?? 'global'}`

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Asistente IA">
      <button
        type="button"
        className="absolute inset-0 bg-navy/40 backdrop-blur-[2px]"
        aria-label="Cerrar asistente"
        onClick={closeChat}
      />
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-border bg-background shadow-2xl sm:max-w-md md:max-w-lg">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Biblioteca Digital
            </p>
            <h2 className="font-serif text-lg font-bold text-navy">Asistente IA</h2>
          </div>
          <button
            type="button"
            onClick={closeChat}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-navy"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
          <ChatShell
            key={shellKey}
            initialMaterialId={materialId}
            materialTitulo={materialTitulo}
            initialFocus={focus}
            embedded
          />
        </div>
      </div>
    </div>
  )
}
