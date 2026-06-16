import Image from 'next/image'
import Link from 'next/link'

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
      <div className="mx-auto flex h-14 w-full max-w-[90rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
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

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}
