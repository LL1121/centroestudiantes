import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { BACKEND_URL, COOKIE_ACCESS } from '@/lib/api/config'

interface RouteContext {
  params: Promise<{ id: string; action: string }>
}

export async function POST(_request: Request, context: RouteContext) {
  const { id, action } = await context.params
  if (action !== 'dismiss' && action !== 'uphold') {
    return NextResponse.json({ detail: 'Acción inválida' }, { status: 400 })
  }

  const jar = await cookies()
  const token = jar.get(COOKIE_ACCESS)?.value
  if (!token) {
    return NextResponse.json({ detail: 'No autenticado' }, { status: 401 })
  }

  const upstream = await fetch(`${BACKEND_URL}/api/v1/copyright/reports/${id}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
