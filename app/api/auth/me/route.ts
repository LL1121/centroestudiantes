import { NextResponse } from 'next/server'

import { ApiRequestError, serverFetch } from '@/lib/api/server'
import type { UserRead } from '@/lib/api/types'

export async function GET() {
  try {
    const user = await serverFetch<UserRead>('/api/v1/users/me')
    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ detail: error.detail }, { status: error.status })
    }
    return NextResponse.json({ detail: 'Error interno' }, { status: 500 })
  }
}
