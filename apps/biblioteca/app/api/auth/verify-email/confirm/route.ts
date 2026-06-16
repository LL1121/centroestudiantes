import { NextResponse } from 'next/server'

import { BACKEND_URL } from '@/lib/api/config'

export async function POST(request: Request) {
  const body = await request.text()
  const upstream = await fetch(`${BACKEND_URL}/api/v1/auth/verify-email/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  })
  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
