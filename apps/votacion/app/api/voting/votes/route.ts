import { NextResponse } from 'next/server'

import { backendFetch } from '@/lib/backend'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ detail: 'JSON inválido' }, { status: 400 })
  }

  const result = await backendFetch<{ ok: boolean; message: string }>(
    '/api/v1/voting/votes',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )

  if (!result.ok) {
    return NextResponse.json({ detail: result.detail }, { status: result.status })
  }

  return NextResponse.json(result.data, { status: 201 })
}
