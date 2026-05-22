import { NextResponse, type NextRequest } from 'next/server'

import { COOKIE_ACCESS } from '@/lib/api/config'

const PUBLIC_PATHS = ['/biblioteca/login']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_ACCESS)?.value
  if (!token) {
    const loginUrl = new URL('/biblioteca/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/biblioteca/:path*'],
}
