import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { BACKEND_URL, COOKIE_ACCESS } from '@/lib/api/config'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Proxy del binario del material para el visor embebido.
 * - Acceso público (igual que la lectura del catálogo).
 * - Propaga `Range` para que PDF.js pueda paginar PDFs grandes.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ detail: 'ID inválido' }, { status: 400 })
  }

  const jar = await cookies()
  const token = jar.get(COOKIE_ACCESS)?.value

  const headers: Record<string, string> = {}
  const range = request.headers.get('range')
  if (range) headers.Range = range
  if (token) headers.Authorization = `Bearer ${token}`

  const upstream = await fetch(`${BACKEND_URL}/api/v1/materials/${id}/file`, {
    headers,
    cache: 'no-store',
  })

  const passthroughHeaders = new Headers()
  for (const name of [
    'content-type',
    'content-length',
    'content-range',
    'content-disposition',
    'accept-ranges',
    'cache-control',
  ]) {
    const v = upstream.headers.get(name)
    if (v) passthroughHeaders.set(name, v)
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: passthroughHeaders,
  })
}

export async function HEAD(request: Request, ctx: RouteParams) {
  const response = await GET(request, ctx)
  return new NextResponse(null, { status: response.status, headers: response.headers })
}
