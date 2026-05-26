'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, LogIn, Upload } from 'lucide-react'

import { cn } from '@/lib/utils'

interface Props {
  isGuest: boolean
}

const items = (isGuest: boolean) =>
  [
    {
      href: '/biblioteca/materiales',
      label: 'Catálogo',
      icon: BookOpen,
      match: (p: string) =>
        p === '/biblioteca' || p === '/biblioteca/materiales' || p.startsWith('/biblioteca/materiales'),
    },
    isGuest
      ? {
          href: '/biblioteca/login',
          label: 'Entrar',
          icon: LogIn,
          match: (p: string) => p === '/biblioteca/login' || p === '/biblioteca/registro',
        }
      : {
          href: '/biblioteca/subir',
          label: 'Subir',
          icon: Upload,
          match: (p: string) => p === '/biblioteca/subir',
        },
  ] as const

/**
 * Navegación inferior fija en pantallas chicas (< md).
 * Evita depender del nav del header que en desktop muestra "Materiales".
 */
export function BibliotecaMobileNav({ isGuest }: Props) {
  const pathname = usePathname()
  const navItems = items(isGuest)

  // En el visor a pantalla completa priorizamos el contenido; el nav vuelve al salir.
  const hideOnReader = pathname.includes('/leer')

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/90 md:hidden',
        hideOnReader && 'hidden',
      )}
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <ul className="mx-auto flex max-w-sm items-stretch justify-around gap-2 px-3 pt-2">
        {navItems.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-navy',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
