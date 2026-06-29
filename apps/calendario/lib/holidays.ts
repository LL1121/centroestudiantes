import type { CalendarEvent, NagerHoliday } from './types'

// nager.date redirige a date.nager.at; el build falla si recibe HTML en vez de JSON.
const NAGER_BASE = 'https://date.nager.at/api/v3/PublicHolidays'

export async function fetchHolidays(year: number): Promise<CalendarEvent[]> {
  try {
    const res = await fetch(`${NAGER_BASE}/${year}/AR`, {
      next: { revalidate: 86400 },
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) return []

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) return []

    const raw = (await res.json()) as NagerHoliday[]
    if (!Array.isArray(raw)) return []

    return raw.map((h) => {
      const isProvincial =
        h.counties !== null && h.counties.length > 0

      return {
        date: h.date,
        title: h.localName,
        kind: isProvincial ? 'provincial' : 'nacional',
        description: isProvincial
          ? `Feriado provincial (${h.counties!.join(', ')})`
          : 'Feriado nacional',
      } satisfies CalendarEvent
    })
  } catch {
    return []
  }
}
