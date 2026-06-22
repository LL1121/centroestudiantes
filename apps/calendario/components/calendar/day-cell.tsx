'use client'

import { cn } from '@/lib/utils'
import type { CalendarEvent } from '@/lib/types'

const KIND_DOT: Record<string, string> = {
  nacional: 'bg-red-500',
  provincial: 'bg-orange-500',
  institucional: 'bg-primary',
  centro: 'bg-emerald-600',
}

interface DayCellProps {
  day: number | null
  date: string | null
  events: CalendarEvent[]
  isToday: boolean
  isSelected: boolean
  isCurrentMonth: boolean
  onClick: (date: string) => void
}

export function DayCell({
  day,
  date,
  events,
  isToday,
  isSelected,
  isCurrentMonth,
  onClick,
}: DayCellProps) {
  if (day === null || date === null) {
    return <div className="aspect-square" aria-hidden />
  }

  const hasEvents = events.length > 0
  const dots = events.slice(0, 3)

  return (
    <button
      type="button"
      onClick={() => onClick(date)}
      aria-label={`${day}${hasEvents ? `, ${events.length} evento${events.length > 1 ? 's' : ''}` : ''}`}
      aria-pressed={isSelected}
      className={cn(
        'relative flex aspect-square w-full flex-col items-center justify-start rounded-lg pt-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40',
        isToday && !isSelected && 'bg-primary/10 font-semibold text-primary',
        isSelected && 'bg-primary text-primary-foreground font-semibold shadow-sm',
        !isToday && !isSelected && 'hover:bg-secondary',
      )}
    >
      <span className={cn('text-[13px] leading-none', isSelected ? 'text-primary-foreground' : '')}>
        {day}
      </span>
      {dots.length > 0 && (
        <div className="mt-1 flex items-center gap-[3px]">
          {dots.map((ev, i) => (
            <span
              key={i}
              className={cn('h-1.5 w-1.5 rounded-full', KIND_DOT[ev.kind] ?? 'bg-gray-400')}
              aria-hidden
            />
          ))}
        </div>
      )}
    </button>
  )
}
