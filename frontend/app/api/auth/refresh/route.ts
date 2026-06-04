import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  ACCESS_MAX_AGE,
  BACKEND_URL,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  REFRESH_MAX_AGE,
} from '@/lib/api/config'
import { accessCookieOptions, refreshCookieOptions } from '@/lib/api/cookies'
import type { ApiError, TokenPair } from '@/lib/api/types'

export async function POST(request: Request) {
  const jar = await cookies()
  const refresh = jar.get(COOKIE_REFRESH)?.value
  if (!refresh) {
    return NextResponse.json({ detail: 'Sin sesión' }, { status: 401 })
  }

  const upstream = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
    cache: 'no-store',
  })

  if (!upstream.ok) {
    jar.delete({ name: COOKIE_ACCESS, path: '/' })
    jar.delete({ name: COOKIE_REFRESH, path: '/api/auth' })
    const error = (await upstream.json().catch(() => ({}))) as ApiError
    return NextResponse.json(
      { detail: error.detail ?? 'Sesión expirada' },
      { status: upstream.status },
    )
  }

  const tokens = (await upstream.json()) as TokenPair
  jar.set(COOKIE_ACCESS, tokens.access_token, {
    ...accessCookieOptions(request),
    maxAge: ACCESS_MAX_AGE,
  })
  jar.set(COOKIE_REFRESH, tokens.refresh_token, {
    ...refreshCookieOptions(request),
    maxAge: REFRESH_MAX_AGE,
  })

  return NextResponse.json({ ok: true })
}
