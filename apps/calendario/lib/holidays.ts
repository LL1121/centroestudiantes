import type { CalendarEvent, NagerHoliday } from './types'

const NAGER_BASE = 'https://nager.date/api/v3/PublicHolidays'

export async function fetchHolidays(year: number): Promise<CalendarEvent[]> {
  const res = await fetch(`${NAGER_BASE}/${year}/AR`, {
    next: { revalidate: 86400 },
  })

  if (!res.ok) return []

  const raw: NagerHoliday[] = await res.json()

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
}
