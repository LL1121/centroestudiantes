import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { BACKEND_URL, COOKIE_ACCESS, COOKIE_REFRESH } from '@/lib/api/config'
import { accessCookieOptions, refreshCookieOptions } from '@/lib/api/cookies'

export async function POST(request: Request) {
  const jar = await cookies()
  const refresh = jar.get(COOKIE_REFRESH)?.value

  if (refresh) {
    await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
      cache: 'no-store',
    }).catch(() => undefined)
  }

  const accessOpts = accessCookieOptions(request)
  const refreshOpts = refreshCookieOptions(request)
  jar.delete({ name: COOKIE_ACCESS, path: accessOpts.path, secure: accessOpts.secure })
  jar.delete({
    name: COOKIE_REFRESH,
    path: refreshOpts.path,
    secure: refreshOpts.secure,
  })
  return NextResponse.json({ ok: true })
}
