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
import type { ApiError, LoginResponse } from '@/lib/api/types'

interface LoginBody {
  email?: string
  password?: string
}

export async function POST(request: Request) {
  let body: LoginBody
  try {
    body = (await request.json()) as LoginBody
  } catch {
    return NextResponse.json({ detail: 'Body inválido' }, { status: 400 })
  }

  if (!body.email || !body.password) {
    return NextResponse.json({ detail: 'Email y contraseña requeridos' }, { status: 400 })
  }

  const form = new URLSearchParams({ username: body.email, password: body.password })

  const upstream = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    cache: 'no-store',
  })

  if (!upstream.ok) {
    const error = (await upstream.json().catch(() => ({ detail: 'Credenciales inválidas' }))) as ApiError
    return NextResponse.json({ detail: error.detail ?? 'Credenciales inválidas' }, { status: upstream.status })
  }

  const result = (await upstream.json()) as LoginResponse

  if (result.requires_2fa) {
    return NextResponse.json({
      requires_2fa: true,
      challenge_token: result.challenge_token,
    })
  }

  if (!result.access_token || !result.refresh_token) {
    return NextResponse.json({ detail: 'Respuesta de login inválida' }, { status: 502 })
  }

  const jar = await cookies()
  jar.set(COOKIE_ACCESS, result.access_token, {
    ...accessCookieOptions(request),
    maxAge: ACCESS_MAX_AGE,
  })
  jar.set(COOKIE_REFRESH, result.refresh_token, {
    ...refreshCookieOptions(request),
    maxAge: REFRESH_MAX_AGE,
  })

  return NextResponse.json({ ok: true })
}
