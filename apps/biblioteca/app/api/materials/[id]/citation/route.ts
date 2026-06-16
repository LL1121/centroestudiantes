import { NextResponse } from 'next/server'

import { BACKEND_URL } from '@/lib/api/config'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ detail: 'ID inválido' }, { status: 400 })
  }

  const upstream = await fetch(`${BACKEND_URL}/api/v1/materials/${id}/citation`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  const text = await upstream.text()
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}
