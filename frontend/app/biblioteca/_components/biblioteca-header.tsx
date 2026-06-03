import Image from 'next/image'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

import { SITE_LOGO } from '@/lib/branding'
import { bibHref } from '@/lib/biblioteca-path'
import type { UserRead } from '@/lib/api/types'

import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

interface Props {
  user: UserRead | null
}

export function BibliotecaHeader({ user }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href={bibHref('/biblioteca')} className="flex items-center gap-2 text-navy">
          <Image
            src={SITE_LOGO}
            alt="Unidos por el IES"
            width={28}
            height={28}
            className="h-7 w-7 rounded-full"
            priority
          />
          <span className="hidden text-sm font-semibold min-[400px]:inline">Biblioteca Digital</span>
        </Link>

        <Link
          href={bibHref('/biblioteca')}
          className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-primary md:hidden"
          aria-label="Materiales"
        >
          <BookOpen className="h-5 w-5" aria-hidden />
        </Link>

        <nav className="ml-2 hidden items-center gap-1 text-sm text-muted-foreground md:flex">
          <NavLink href={bibHref('/biblioteca')} icon={<BookOpen className="h-4 w-4" />}>
            Materiales
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}

function NavLink({
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
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors hover:bg-secondary/50 hover:text-navy"
    >
      {icon}
      {children}
    </Link>
  )
}
