import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { BACKEND_URL, COOKIE_ACCESS } from '@/lib/api/config'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const jar = await cookies()
  const token = jar.get(COOKIE_ACCESS)?.value
  if (!token) {
    return NextResponse.json({ detail: 'No autenticado' }, { status: 401 })
  }

  let upstreamForm: FormData
  try {
    upstreamForm = await request.formData()
  } catch {
    return NextResponse.json({ detail: 'Body inválido' }, { status: 400 })
  }

  const upstream = await fetch(`${BACKEND_URL}/api/v1/materials/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: upstreamForm,
    cache: 'no-store',
  })

  const text = await upstream.text()
  const headers = new Headers({
    'content-type': upstream.headers.get('content-type') ?? 'application/json',
  })
  return new NextResponse(text, { status: upstream.status, headers })
}
