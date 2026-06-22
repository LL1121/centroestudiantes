'use client'

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
} from 'date-fns'
import { DayCell } from './day-cell'
import type { CalendarEvent } from '@/lib/types'

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface CalendarGridProps {
  currentDate: Date
  events: CalendarEvent[]
  selectedDay: string | null
  onDayClick: (date: string) => void
}

export function CalendarGrid({
  currentDate,
  events,
  selectedDay,
  onDayClick,
}: CalendarGridProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  // Week starts on Monday (locale-aware)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = []
    acc[ev.date].push(ev)
    return acc
  }, {})

  return (
    <div>
      {/* Weekday header */}
      <div className="mb-1 grid grid-cols-7">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDate[dateStr] ?? []
          return (
            <DayCell
              key={dateStr}
              day={day.getDate()}
              date={dateStr}
              events={dayEvents}
              isToday={isToday(day)}
              isSelected={selectedDay === dateStr}
              isCurrentMonth={isSameMonth(day, currentDate)}
              onClick={onDayClick}
            />
          )
        })}
      </div>
    </div>
  )
}
