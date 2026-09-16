import { NextResponse } from 'next/server'

import { backendFetch } from '@/lib/backend'
import type { Profesor } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await backendFetch<Profesor[]>('/api/v1/voting/professors')
  if (!result.ok) {
    return NextResponse.json({ detail: result.detail }, { status: result.status })
  }
  return NextResponse.json(result.data)
}
