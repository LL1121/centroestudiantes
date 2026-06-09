'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { ChevronDown, LogIn, LogOut, Scale, Settings, Shield, UserPlus, Users } from 'lucide-react'

import type { UserRead } from '@/lib/api/types'
import { bibHref } from '@/lib/biblioteca-path'

interface Props {
  user: UserRead | null
}

export function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [pending, start] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [])

  const onLogout = () => {
    start(async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
      setOpen(false)
      router.replace(bibHref('/biblioteca'))
      router.refresh()
    })
  }

  if (!user) {
    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]"
        >
          Entrar
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </button>
        {open && (
          <Menu>
            <MenuLink href={bibHref('/biblioteca/login')} icon={<LogIn className="h-4 w-4" />}>
              Iniciar sesión
            </MenuLink>
            <MenuLink href={bibHref('/biblioteca/registro')} icon={<UserPlus className="h-4 w-4" />}>
              Crear cuenta
            </MenuLink>
            <MenuLink href={bibHref('/biblioteca/legal')} icon={<Scale className="h-4 w-4" />}>
              Derechos de autor
            </MenuLink>
          </Menu>
        )}
      </div>
    )
  }

  const initials = user.full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?'

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-2 pr-3 text-xs font-medium text-navy transition-colors hover:border-primary/40"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
          {initials}
        </span>
        <span className="hidden max-w-[12ch] truncate sm:inline">{user.full_name.split(' ')[0]}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </button>
      {open && (
        <Menu>
          <div className="px-3 py-2 text-[11px]">
            <p className="font-semibold text-navy">{user.full_name}</p>
            <p className="text-muted-foreground">{user.email}</p>
            <p className="mt-1 inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy">
              {user.role}
            </p>
          </div>
          <MenuLink href={bibHref('/biblioteca/cuenta/seguridad')} icon={<Settings className="h-4 w-4" />}>
            Seguridad
          </MenuLink>
          {user.role === 'admin' && (
            <MenuLink href={bibHref('/biblioteca/admin')} icon={<Users className="h-4 w-4" />}>
              Administración
            </MenuLink>
          )}
          {(user.role === 'admin' || user.role === 'moderador') && (
            <MenuLink href={bibHref('/biblioteca/moderacion')} icon={<Shield className="h-4 w-4" />}>
              Moderación
            </MenuLink>
          )}
          <MenuLink href={bibHref('/biblioteca/legal')} icon={<Scale className="h-4 w-4" />}>
            Derechos de autor
          </MenuLink>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={onLogout}
            disabled={pending}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-navy transition-colors hover:bg-secondary/60 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </Menu>
      )}
    </div>
  )
}

function Menu({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="menu"
      className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-lg"
    >
      {children}
    </div>
  )
}

function MenuLink({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-navy transition-colors hover:bg-secondary/60"
    >
      {icon}
      {children}
    </Link>
  )
}
