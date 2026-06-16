'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { ChatPanel } from './chat-panel'

export type ChatFocus = 'global' | 'local'

export interface ChatOpenOptions {
  focus?: ChatFocus
  materialId?: string | null
  titulo?: string | null
}

interface ChatContextValue {
  open: boolean
  focus: ChatFocus
  materialId: string | null
  materialTitulo: string | null
  openChat: (options?: ChatOpenOptions) => void
  closeChat: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [focus, setFocus] = useState<ChatFocus>('global')
  const [materialId, setMaterialId] = useState<string | null>(null)
  const [materialTitulo, setMaterialTitulo] = useState<string | null>(null)

  const openChat = useCallback((options?: ChatOpenOptions) => {
    const nextFocus = options?.focus ?? (options?.materialId ? 'local' : 'global')
    setFocus(nextFocus)
    setMaterialId(options?.materialId ?? null)
    setMaterialTitulo(options?.titulo ?? null)
    setOpen(true)
  }, [])

  const closeChat = useCallback(() => setOpen(false), [])

  const value = useMemo(
    () => ({ open, focus, materialId, materialTitulo, openChat, closeChat }),
    [open, focus, materialId, materialTitulo, openChat, closeChat],
  )

  return (
    <ChatContext.Provider value={value}>
      {children}
      <ChatPanel />
    </ChatContext.Provider>
  )
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) {
    throw new Error('useChat debe usarse dentro de ChatProvider')
  }
  return ctx
}
