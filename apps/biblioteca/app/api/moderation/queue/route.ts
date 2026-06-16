import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { BACKEND_URL, COOKIE_ACCESS } from '@/lib/api/config'

export async function GET() {
  const jar = await cookies()
  const token = jar.get(COOKIE_ACCESS)?.value
  if (!token) {
    return NextResponse.json({ detail: 'No autenticado' }, { status: 401 })
  }

  const upstream = await fetch(`${BACKEND_URL}/api/v1/moderation/queue`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
