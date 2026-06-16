import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { BACKEND_URL, COOKIE_ACCESS } from '@/lib/api/config'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params
  const jar = await cookies()
  const token = jar.get(COOKIE_ACCESS)?.value
  if (!token) {
    return NextResponse.json({ detail: 'No autenticado' }, { status: 401 })
  }
  const upstream = await fetch(`${BACKEND_URL}/api/v1/users/${id}/reset-password`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
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
