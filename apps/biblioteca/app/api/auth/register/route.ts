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
import { passwordStrengthMessage } from '@/lib/password-policy'
import type { ApiError, TokenPair } from '@/lib/api/types'

interface RegisterBody {
  email?: string
  full_name?: string
  password?: string
}

export async function POST(request: Request) {
  let body: RegisterBody
  try {
    body = (await request.json()) as RegisterBody
  } catch {
    return NextResponse.json({ detail: 'Body inválido' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const fullName = body.full_name?.trim()
  const password = body.password ?? ''

  if (!email || !fullName || !password) {
    return NextResponse.json(
      { detail: 'Email, nombre y contraseña son obligatorios' },
      { status: 400 },
    )
  }
  const pwdError = passwordStrengthMessage(password)
  if (pwdError) {
    return NextResponse.json({ detail: pwdError }, { status: 400 })
  }

  const registerRes = await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, full_name: fullName, password, role: 'alumno' }),
    cache: 'no-store',
  })

  if (!registerRes.ok) {
    const error = (await registerRes.json().catch(() => ({ detail: 'No pudimos registrarte' }))) as ApiError
    return NextResponse.json(
      { detail: error.detail ?? 'No pudimos registrarte' },
      { status: registerRes.status },
    )
  }

  const loginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: email, password }).toString(),
    cache: 'no-store',
  })

  if (!loginRes.ok) {
    return NextResponse.json({ ok: true, autoLogin: false })
  }

  const tokens = (await loginRes.json()) as TokenPair
  const jar = await cookies()
  jar.set(COOKIE_ACCESS, tokens.access_token, {
    ...accessCookieOptions(request),
    maxAge: ACCESS_MAX_AGE,
  })
  jar.set(COOKIE_REFRESH, tokens.refresh_token, {
    ...refreshCookieOptions(request),
    maxAge: REFRESH_MAX_AGE,
  })

  return NextResponse.json({ ok: true, autoLogin: true })
}
