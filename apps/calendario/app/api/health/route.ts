import { NextResponse } from 'next/server'

/** Liveness liviano para Docker HEALTHCHECK. */
export const dynamic = 'force-static'

export function GET() {
  return NextResponse.json({ status: 'ok' })
}
