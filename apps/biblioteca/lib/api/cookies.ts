/**
 * Flag Secure en cookies de auth.
 *
 * En Docker el origen es HTTP (puerto 3000), pero el usuario entra por HTTPS
 * vía Cloudflare Tunnel. Cloudflare envía `X-Forwarded-Proto: https`.
 * No usar solo NODE_ENV === 'production' (rompe login en http://IP:3005).
 */
export function cookieSecure(request: Request): boolean {
  const explicit = process.env.COOKIE_SECURE?.trim().toLowerCase()
  if (explicit === 'true') return true
  if (explicit === 'false') return false

  const forwarded = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  if (forwarded === 'https') return true
  if (forwarded === 'http') return false

  try {
    const { protocol } = new URL(request.url)
    if (protocol === 'https:') return true
    if (protocol === 'http:') return false
  } catch {
    /* ignore */
  }

  return process.env.NODE_ENV !== 'production'
}

export function accessCookieOptions(request: Request) {
  return {
    httpOnly: true as const,
    secure: cookieSecure(request),
    sameSite: 'lax' as const,
    path: '/',
  }
}

export function refreshCookieOptions(request: Request) {
  return {
    httpOnly: true as const,
    secure: cookieSecure(request),
    sameSite: 'lax' as const,
    path: '/api/auth',
  }
}
