import 'server-only'

import { cookies } from 'next/headers'

import { BACKEND_URL, COOKIE_ACCESS, COOKIE_REFRESH } from './config'

/** Intenta renovar el access token usando el refresh cookie. */
export async function tryRefreshSession(): Promise<string | null> {
  const jar = await cookies()
  const refresh = jar.get(COOKIE_REFRESH)?.value
  if (!refresh) return null

  const res = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
    cache: 'no-store',
  })
  if (!res.ok) return null

  const data = (await res.json()) as { access_token: string; refresh_token: string }
  jar.set(COOKIE_ACCESS, data.access_token, { httpOnly: true, sameSite: 'lax', path: '/' })
  jar.set(COOKIE_REFRESH, data.refresh_token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/api/auth',
  })
  return data.access_token
}
