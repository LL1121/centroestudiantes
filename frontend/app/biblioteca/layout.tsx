import { cookies } from 'next/headers'
import type { ReactNode } from 'react'

import { getOptionalUser } from '@/lib/api/auth'

import { AiFab } from './_components/ai-fab'
import { ChatProvider } from './_components/chat-provider'
import { BibliotecaHeader } from './_components/biblioteca-header'
import { BibliotecaMobileNav } from './_components/biblioteca-mobile-nav'
import {
  BIBLIOTECA_THEME_KEY,
  BibliotecaThemeProvider,
  type BibliotecaTheme,
} from './_components/biblioteca-theme-provider'
import { BibliotecaToaster } from './_components/biblioteca-toaster'

export const dynamic = 'force-dynamic'

export default async function BibliotecaLayout({ children }: { children: ReactNode }) {
  const [user, jar] = await Promise.all([getOptionalUser(), cookies()])
  const stored = jar.get(BIBLIOTECA_THEME_KEY)?.value
  const initialTheme: BibliotecaTheme = stored === 'dark' ? 'dark' : 'light'

  return (
    <BibliotecaThemeProvider initialTheme={initialTheme}>
      <ChatProvider>
        <div className="flex min-h-dvh flex-col pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          <BibliotecaHeader user={user} />
          <main className="flex flex-1 flex-col">{children}</main>
          <AiFab isGuest={user === null} />
          <BibliotecaMobileNav isGuest={user === null} />
          <BibliotecaToaster />
        </div>
      </ChatProvider>
    </BibliotecaThemeProvider>
  )
}
