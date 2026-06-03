import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { BIBLIOTECA_ONLY } from '@/lib/biblioteca-path'

// En el deploy AISLADO de la biblioteca (NEXT_PUBLIC_BIBLIOTECA_ONLY=true) la app
// vive en la raíz del dominio. Acá reescribimos internamente cualquier ruta
// pública (`/`, `/login`, `/materiales/...`) hacia el árbol real `/biblioteca/...`
// sin cambiar la URL que ve el usuario. En el deploy del centro no hace nada.
export function middleware(request: NextRequest) {
  if (!BIBLIOTECA_ONLY) return NextResponse.next()

  const { pathname } = request.nextUrl
  if (pathname.startsWith('/biblioteca')) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = pathname === '/' ? '/biblioteca' : `/biblioteca${pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  // Todo menos API, assets de Next y archivos con extensión (favicon, imágenes…).
  matcher: ['/((?!api/|_next/|.*\\..*).*)'],
}
