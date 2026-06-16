import { NextResponse } from 'next/server'

import { BACKEND_URL } from '@/lib/api/config'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ detail: 'Body inválido' }, { status: 400 })
  }

  const upstream = await fetch(`${BACKEND_URL}/api/v1/copyright/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
