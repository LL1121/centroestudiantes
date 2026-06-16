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
import type { TokenPair } from '@/lib/api/types'

export async function POST(request: Request) {
  const body = await request.text()
  const upstream = await fetch(`${BACKEND_URL}/api/v1/auth/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  })
  if (!upstream.ok) {
    const text = await upstream.text()
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const tokens = (await upstream.json()) as TokenPair
  const jar = await cookies()
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
