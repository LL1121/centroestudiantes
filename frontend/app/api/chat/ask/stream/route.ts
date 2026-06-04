import { cookies } from 'next/headers'

import { BACKEND_URL, COOKIE_ACCESS } from '@/lib/api/config'

export async function POST(request: Request) {
  const jar = await cookies()
  const token = jar.get(COOKIE_ACCESS)?.value
  if (!token) {
    return new Response(JSON.stringify({ detail: 'No autenticado' }), { status: 401 })
  }

  const body = await request.text()
  const upstream = await fetch(`${BACKEND_URL}/api/v1/chat/ask/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
    cache: 'no-store',
  })

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text()
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
