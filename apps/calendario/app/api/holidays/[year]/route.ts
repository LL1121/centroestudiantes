import { NextResponse } from 'next/server'
import { fetchHolidays } from '@/lib/holidays'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string }> },
) {
  const { year } = await params
  const yearNum = parseInt(year, 10)

  if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2040) {
    return NextResponse.json({ error: 'Año inválido' }, { status: 400 })
  }

  const holidays = await fetchHolidays(yearNum)
  return NextResponse.json(holidays)
}
