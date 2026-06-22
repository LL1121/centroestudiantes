'use client'

import { useState, useCallback, useMemo } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CalendarGrid } from './calendar-grid'
import { EventPanel } from './event-panel'
import { Legend } from '@/components/legend'
import type { CalendarEvent } from '@/lib/types'

interface CalendarShellProps {
  initialEvents: CalendarEvent[]
}

export function CalendarShell({ initialEvents }: CalendarShellProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [loadingYear, setLoadingYear] = useState(false)

  const currentYear = currentDate.getFullYear()

  const fetchYearEvents = useCallback(async (year: number) => {
    setLoadingYear(true)
    try {
      const res = await fetch(`/api/holidays/${year}`)
      if (res.ok) {
        const holidays: CalendarEvent[] = await res.json()
        setEvents((prev) => {
          // Keep institutional events and replace holidays for the new year
          const institutionalOnly = prev.filter(
            (e) => e.kind === 'institucional' || e.kind === 'centro',
          )
          return [...institutionalOnly, ...holidays]
        })
      }
    } finally {
      setLoadingYear(false)
    }
  }, [])

  const goToPrevMonth = useCallback(() => {
    setCurrentDate((d) => {
      const next = subMonths(d, 1)
      if (next.getFullYear() !== d.getFullYear()) {
        fetchYearEvents(next.getFullYear())
      }
      return next
    })
    setSelectedDay(null)
  }, [fetchYearEvents])

  const goToNextMonth = useCallback(() => {
    setCurrentDate((d) => {
      const next = addMonths(d, 1)
      if (next.getFullYear() !== d.getFullYear()) {
        fetchYearEvents(next.getFullYear())
      }
      return next
    })
    setSelectedDay(null)
  }, [fetchYearEvents])

  const goToToday = useCallback(() => {
    const today = new Date()
    if (today.getFullYear() !== currentYear) {
      fetchYearEvents(today.getFullYear())
    }
    setCurrentDate(today)
    setSelectedDay(null)
  }, [currentYear, fetchYearEvents])

  const selectedEvents = useMemo(
    () => (selectedDay ? events.filter((e) => e.date === selectedDay) : []),
    [selectedDay, events],
  )

  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: es })

  return (
    <div className="flex flex-col gap-6">
      {/* Calendar header: navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPrevMonth}
            aria-label="Mes anterior"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="min-w-[14ch] text-center text-lg font-semibold capitalize text-navy">
            {monthLabel}
          </h2>
          <button
            type="button"
            onClick={goToNextMonth}
            aria-label="Mes siguiente"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={goToToday}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Hoy
        </button>
      </div>

      {loadingYear && (
        <p className="text-center text-xs text-muted-foreground">Cargando feriados…</p>
      )}

      {/* Grid + panel layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          <CalendarGrid
            currentDate={currentDate}
            events={events}
            selectedDay={selectedDay}
            onDayClick={setSelectedDay}
          />
        </div>

        <aside className="hidden lg:block">
          {selectedDay ? (
            <EventPanel
              date={selectedDay}
              events={selectedEvents}
              onClose={() => setSelectedDay(null)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Hacé click en un día para ver sus eventos.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Mobile: event panel below grid */}
      {selectedDay && (
        <div className="lg:hidden">
          <EventPanel
            date={selectedDay}
            events={selectedEvents}
            onClose={() => setSelectedDay(null)}
          />
        </div>
      )}

      {/* Legend */}
      <Legend />
    </div>
  )
}
