import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { BACKEND_URL, COOKIE_ACCESS } from '@/lib/api/config'
import { proxyErrorResponse } from '@/lib/api/proxy-error'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const jar = await cookies()
  const token = jar.get(COOKIE_ACCESS)?.value
  if (!token) {
    return NextResponse.json({ detail: 'No autenticado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ detail: 'Body inválido' }, { status: 400 })
  }

  const upstream = await fetch(`${BACKEND_URL}/api/v1/chat/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!upstream.ok) {
    return proxyErrorResponse(upstream, 'No pudimos hablar con el asistente.')
  }

  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    },
  })
}
