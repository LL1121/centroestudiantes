import { NextResponse } from 'next/server'

import { BACKEND_URL } from '@/lib/api/config'

export async function POST(request: Request) {
  const body = await request.text()
  const upstream = await fetch(`${BACKEND_URL}/api/v1/auth/2fa/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  })
  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204 })
  }
  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
