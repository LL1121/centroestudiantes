export type EventKind = 'nacional' | 'provincial' | 'institucional' | 'centro'

export interface CalendarEvent {
  date: string
  title: string
  kind: EventKind
  description?: string
}

export interface NagerHoliday {
  date: string
  localName: string
  name: string
  countryCode: string
  fixed: boolean
  global: boolean
  counties: string[] | null
  launchYear: number | null
  types: string[]
}
