import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { COOKIE_ACCESS, COOKIE_REFRESH } from '@/lib/api/config'

export async function POST() {
  const jar = await cookies()
  jar.delete(COOKIE_ACCESS)
  jar.delete({ name: COOKIE_REFRESH, path: '/api/auth' })
  return NextResponse.json({ ok: true })
}
