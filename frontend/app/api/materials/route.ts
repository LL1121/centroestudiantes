import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { BACKEND_URL, COOKIE_ACCESS } from '@/lib/api/config'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const jar = await cookies()
  const token = jar.get(COOKIE_ACCESS)?.value
  if (!token) {
    return NextResponse.json({ detail: 'No autenticado' }, { status: 401 })
  }

  const url = new URL(request.url)
  const qs = url.searchParams.toString()
  const path = qs ? `/api/v1/materials?${qs}` : '/api/v1/materials'

  const upstream = await fetch(`${BACKEND_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  })

  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}
