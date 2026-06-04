'use client'

import { ArrowUp, Bot, ChevronDown, Globe2, ShieldAlert, Sparkles, User as UserIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

type Focus = 'global' | 'local'

interface ChunkSource {
  material_id: string
  titulo: string | null
  chunk_idx: number
  snippet: string
  distance: number
}

interface AskResponse {
  answer: string
  sources: ChunkSource[]
  blocked: boolean
  blocked_reason: string | null
  focus: Focus
}

interface ApiError {
  detail?: string
}

type Message =
  | { id: string; role: 'user'; content: string }
  | {
      id: string
      role: 'assistant'
      content: string
      blocked: boolean
      sources: ChunkSource[]
      focus: Focus
    }

interface Props {
  initialMaterialId: string | null
  materialTitulo: string | null
}

export function ChatShell({ initialMaterialId, materialTitulo }: Props) {
  const inputId = useId()
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [focus, setFocus] = useState<Focus>(initialMaterialId ? 'local' : 'global')
  const [pending, start] = useTransition()
  const listRef = useRef<HTMLDivElement>(null)

  const hasMaterial = Boolean(initialMaterialId)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, pending])

  const send = () => {
    const content = draft.trim()
    if (!content || pending) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    }
    setMessages((prev) => [...prev, userMsg])
    setDraft('')

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        blocked: false,
        sources: [],
        focus,
      },
    ])

    start(async () => {
      const response = await fetch('/api/chat/ask/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          focus,
          material_id: focus === 'local' ? initialMaterialId : null,
        }),
      })

      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => ({}))) as ApiError
        toast.error(body.detail ?? 'No pudimos hablar con el asistente.')
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.role === 'assistant'
              ? { ...m, content: body.detail ?? 'Hubo un error.' }
              : m,
          ),
        )
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const lines = part.split('\n')
          let event = 'message'
          let dataLine = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) event = line.slice(7).trim()
            if (line.startsWith('data: ')) dataLine = line.slice(6)
          }
          if (!dataLine) continue

          try {
            const payload = JSON.parse(dataLine) as Record<string, unknown>
            if (event === 'token' && typeof payload.delta === 'string') {
              accumulated += payload.delta
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId && m.role === 'assistant'
                    ? { ...m, content: accumulated }
                    : m,
                ),
              )
            }
            if (event === 'done') {
              const donePayload = payload as unknown as AskResponse
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId && m.role === 'assistant'
                    ? {
                        ...m,
                        content: donePayload.blocked
                          ? donePayload.answer
                          : accumulated || donePayload.answer,
                        blocked: donePayload.blocked,
                        sources: donePayload.sources ?? [],
                        focus: donePayload.focus ?? focus,
                      }
                    : m,
                ),
              )
            }
            if (event === 'error') {
              const detail =
                typeof payload.detail === 'string' ? payload.detail : 'Error del asistente'
              toast.error(detail)
            }
          } catch {
            /* ignore malformed SSE chunk */
          }
        }
      }
    })
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-border bg-card shadow-sm">
      <FocusBar
        focus={focus}
        onChange={setFocus}
        hasMaterial={hasMaterial}
        materialTitulo={materialTitulo}
      />

      <div
        ref={listRef}
        className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5"
        style={{ minHeight: 320 }}
      >
        {messages.length === 0 && !pending && <EmptyState focus={focus} />}
        {messages.map((m) =>
          m.role === 'user' ? (
            <UserBubble key={m.id} content={m.content} />
          ) : (
            <AssistantBubble key={m.id} message={m} />
          ),
        )}
        {pending && <LoadingBubble />}
      </div>

      <div className="border-t border-border bg-secondary/40 p-3 sm:p-4">
        <label htmlFor={inputId} className="sr-only">
          Escribí tu consulta
        </label>
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm focus-within:border-primary">
          <textarea
            id={inputId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={pending}
            rows={1}
            placeholder={
              focus === 'local'
                ? 'Preguntá sobre este apunte…'
                : 'Preguntá al Oráculo del IES (toda la biblioteca)…'
            }
            className="max-h-36 min-h-[24px] flex-1 resize-none bg-transparent text-sm text-navy outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={send}
            disabled={pending || !draft.trim()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition-transform hover:scale-[1.03] hover:bg-primary/90 disabled:opacity-50"
            aria-label="Enviar consulta"
          >
            <ArrowUp className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Enter envía · Shift + Enter agrega salto de línea.
        </p>
      </div>
    </div>
  )
}

interface FocusBarProps {
  focus: Focus
  onChange: (next: Focus) => void
  hasMaterial: boolean
  materialTitulo: string | null
}

function FocusBar({ focus, onChange, hasMaterial, materialTitulo }: FocusBarProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-center gap-2 text-xs font-medium text-navy">
        <Sparkles className="h-4 w-4 text-gold" aria-hidden />
        <span>{focus === 'global' ? 'Oráculo del IES' : 'Apunte específico'}</span>
        {focus === 'local' && materialTitulo && (
          <span className="ml-1 truncate text-muted-foreground">· {materialTitulo}</span>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Modo del asistente"
        className="inline-flex self-start rounded-full border border-border bg-secondary/40 p-1 sm:self-auto"
      >
        <FocusPill
          active={focus === 'global'}
          onClick={() => onChange('global')}
          icon={<Globe2 className="h-3.5 w-3.5" aria-hidden />}
          label="Oráculo"
        />
        <FocusPill
          active={focus === 'local'}
          disabled={!hasMaterial}
          onClick={() => hasMaterial && onChange('local')}
          icon={<Bot className="h-3.5 w-3.5" aria-hidden />}
          label="Apunte"
          title={hasMaterial ? undefined : 'Abrí un material para activar este modo.'}
        />
      </div>
    </div>
  )
}

interface FocusPillProps {
  active: boolean
  disabled?: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  title?: string
}

function FocusPill({ active, disabled, onClick, icon, label, title }: FocusPillProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-navy hover:text-primary'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function EmptyState({ focus }: { focus: Focus }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-10 text-center">
      <Bot className="h-7 w-7 text-primary" aria-hidden />
      <p className="font-semibold text-navy">Empezá tu consulta</p>
      <p className="text-xs text-muted-foreground">
        {focus === 'global'
          ? 'El Oráculo busca en toda la biblioteca, ignorando anuncios expirados.'
          : 'Te respondo solo con el contenido del apunte seleccionado.'}
      </p>
    </div>
  )
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="flex max-w-[85%] items-start gap-2">
        <div className="rounded-2xl rounded-tr-md bg-primary px-3 py-2 text-sm text-primary-foreground shadow">
          {content}
        </div>
        <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserIcon className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </div>
  )
}

interface AssistantBubbleProps {
  message: Extract<Message, { role: 'assistant' }>
}

function AssistantBubble({ message }: AssistantBubbleProps) {
  const [showSources, setShowSources] = useState(false)
  const Icon = message.blocked ? ShieldAlert : Bot

  return (
    <div className="flex justify-start">
      <div className="flex max-w-[90%] items-start gap-2">
        <span
          className={`mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            message.blocked ? 'bg-destructive/10 text-destructive' : 'bg-gold/15 text-gold'
          }`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="space-y-2">
          <div
            className={`rounded-2xl rounded-tl-md border bg-card px-3 py-2 text-sm leading-relaxed shadow-sm ${
              message.blocked ? 'border-destructive/30 text-navy' : 'border-border text-navy'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>

          {message.sources.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSources((value) => !value)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary"
              aria-expanded={showSources}
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showSources ? 'rotate-180' : ''}`}
                aria-hidden
              />
              {showSources ? 'Ocultar' : 'Ver'} fuentes ({message.sources.length})
            </button>
          )}

          {showSources && (
            <ul className="space-y-1">
              {message.sources.map((source) => (
                <li
                  key={`${source.material_id}-${source.chunk_idx}`}
                  className="rounded-lg border border-border bg-secondary/50 px-2 py-1.5 text-[11px] text-navy"
                >
                  <div className="flex items-center justify-between gap-2 text-muted-foreground">
                    <span className="truncate font-medium text-navy">
                      {source.titulo ?? source.material_id.slice(0, 8)}
                    </span>
                    <span>#{source.chunk_idx} · d={source.distance.toFixed(3)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-muted-foreground">{source.snippet}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[80%] items-start gap-2">
        <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Bot className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <div className="h-3 w-44 animate-pulse rounded-full bg-secondary" />
          <div className="h-3 w-64 animate-pulse rounded-full bg-secondary" />
          <div className="h-3 w-32 animate-pulse rounded-full bg-secondary" />
        </div>
      </div>
    </div>
  )
}
