import { SiteHeader } from '@/components/site-header'
import { CalendarShell } from '@/components/calendar/calendar-shell'
import { fetchHolidays } from '@/lib/holidays'
import { INSTITUTIONAL_EVENTS } from '@/lib/institutional-events'

// ISR: re-fetch feriados una vez por día
export const revalidate = 86400

export default async function CalendarPage() {
  const year = new Date().getFullYear()
  const holidays = await fetchHolidays(year)
  const allEvents = [...holidays, ...INSTITUTIONAL_EVENTS]

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-bold text-navy sm:text-3xl">
            Calendario {year}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Feriados nacionales, provinciales (Mendoza) y fechas importantes del IES N° 9018.
          </p>
        </div>

        <CalendarShell initialEvents={allEvents} />
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Datos de feriados:{' '}
        <a
          href="https://date.nager.at"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          Nager.Date
        </a>{' '}
        · Centro de Estudiantes &quot;Unidos por el IES&quot;
      </footer>
    </div>
  )
}
