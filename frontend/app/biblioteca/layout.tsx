import type { ReactNode } from 'react'

import { getOptionalUser } from '@/lib/api/auth'

import { AiFab } from './_components/ai-fab'
import { BibliotecaHeader } from './_components/biblioteca-header'
import { BibliotecaMobileNav } from './_components/biblioteca-mobile-nav'
import { BibliotecaThemeProvider } from './_components/biblioteca-theme-provider'
import { BibliotecaToaster } from './_components/biblioteca-toaster'

export const dynamic = 'force-dynamic'

export default async function BibliotecaLayout({ children }: { children: ReactNode }) {
  const user = await getOptionalUser()

  return (
    <BibliotecaThemeProvider>
      <div className="flex min-h-dvh flex-col pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <BibliotecaHeader user={user} />
        <main className="flex-1">{children}</main>
        <AiFab isGuest={user === null} />
        <BibliotecaMobileNav isGuest={user === null} />
        <BibliotecaToaster />
      </div>
    </BibliotecaThemeProvider>
  )
}
