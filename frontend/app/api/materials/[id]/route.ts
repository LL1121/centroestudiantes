import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { BACKEND_URL, COOKIE_ACCESS } from '@/lib/api/config'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface RouteParams {
  params: Promise<{ id: string }>
}

async function proxyJson(
  upstream: Response,
): Promise<NextResponse> {
  const text = await upstream.text()
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ detail: 'ID inválido' }, { status: 400 })
  }

  const upstream = await fetch(`${BACKEND_URL}/api/v1/materials/${id}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  return proxyJson(upstream)
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ detail: 'ID inválido' }, { status: 400 })
  }

  const jar = await cookies()
  const token = jar.get(COOKIE_ACCESS)?.value
  if (!token) {
    return NextResponse.json({ detail: 'No autenticado' }, { status: 401 })
  }

  let body: string
  try {
    body = await request.text()
  } catch {
    return NextResponse.json({ detail: 'Body inválido' }, { status: 400 })
  }

  const upstream = await fetch(`${BACKEND_URL}/api/v1/materials/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body,
    cache: 'no-store',
  })

  return proxyJson(upstream)
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ detail: 'ID inválido' }, { status: 400 })
  }

  const jar = await cookies()
  const token = jar.get(COOKIE_ACCESS)?.value
  if (!token) {
    return NextResponse.json({ detail: 'No autenticado' }, { status: 401 })
  }

  const upstream = await fetch(`${BACKEND_URL}/api/v1/materials/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  })

  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  const text = await upstream.text()
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}
