import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { BACKEND_URL, COOKIE_ACCESS } from '@/lib/api/config'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const jar = await cookies()
  const token = jar.get(COOKIE_ACCESS)?.value

  const url = new URL(request.url)
  const qs = url.searchParams.toString()
  const path = qs ? `/api/v1/materials?${qs}` : '/api/v1/materials'

  const headers: HeadersInit = { Accept: 'application/json' }
  if (token) (headers as Record<string, string>).Authorization = `Bearer ${token}`

  const upstream = await fetch(`${BACKEND_URL}${path}`, {
    headers,
    cache: 'no-store',
  })

  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}
