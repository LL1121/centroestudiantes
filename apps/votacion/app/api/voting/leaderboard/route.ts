import { NextResponse } from 'next/server'

import { backendFetch } from '@/lib/backend'
import type { LeaderboardEntry } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await backendFetch<LeaderboardEntry[]>('/api/v1/voting/leaderboard')
  if (!result.ok) {
    return NextResponse.json({ detail: result.detail }, { status: result.status })
  }
  return NextResponse.json(result.data)
}
