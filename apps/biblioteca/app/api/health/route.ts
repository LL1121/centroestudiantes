import { NextResponse } from 'next/server'

/** Liveness liviano para Docker HEALTHCHECK — no llama al backend. */
export const dynamic = 'force-static'

export function GET() {
  return NextResponse.json({ status: 'ok' })
}
