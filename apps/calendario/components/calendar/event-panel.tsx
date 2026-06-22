'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { X, Calendar, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CalendarEvent, EventKind } from '@/lib/types'

const KIND_CONFIG: Record<
  EventKind,
  { label: string; dotClass: string; badgeClass: string }
> = {
  nacional: {
    label: 'Feriado nacional',
    dotClass: 'bg-red-500',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
  },
  provincial: {
    label: 'Feriado provincial',
    dotClass: 'bg-orange-500',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  institucional: {
    label: 'Institucional · IES',
    dotClass: 'bg-primary',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  centro: {
    label: 'Centro de Estudiantes',
    dotClass: 'bg-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
}

interface EventPanelProps {
  date: string | null
  events: CalendarEvent[]
  onClose: () => void
}

export function EventPanel({ date, events, onClose }: EventPanelProps) {
  if (!date) return null

  const parsedDate = parseISO(date)
  const formattedDate = format(parsedDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Eventos del día
          </p>
          <p className="mt-0.5 text-sm font-semibold capitalize text-navy">{formattedDate}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Cerrar panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay eventos para este día.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map((ev, i) => {
              const config = KIND_CONFIG[ev.kind]
              return (
                <li key={i} className="flex gap-3">
                  <span
                    className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', config.dotClass)}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug text-foreground">{ev.title}</p>
                    <span
                      className={cn(
                        'mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                        config.badgeClass,
                      )}
                    >
                      {config.label}
                    </span>
                    {ev.description && (
                      <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                        {ev.description}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
