import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// En el deploy AISLADO de la biblioteca queremos que la raíz (`/`) muestre el
// catálogo en vez de la landing del centro de estudiantes, SIN cambiar la URL.
// Se activa por dominio (`biblioteca.*`) o forzando BIBLIOTECA_ONLY=true.
function isBibliotecaOnly(request: NextRequest): boolean {
  if (process.env.BIBLIOTECA_ONLY === 'true') return true
  const host = request.headers.get('host') ?? ''
  return host.split(':')[0].startsWith('biblioteca.')
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/' && isBibliotecaOnly(request)) {
    const url = request.nextUrl.clone()
    url.pathname = '/biblioteca'
    return NextResponse.rewrite(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/'],
}
