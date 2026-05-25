import type { ReactNode } from 'react'

import { getOptionalUser } from '@/lib/api/auth'

import { BibliotecaHeader } from './_components/biblioteca-header'
import { BibliotecaThemeProvider } from './_components/biblioteca-theme-provider'
import { BibliotecaToaster } from './_components/biblioteca-toaster'

export const dynamic = 'force-dynamic'

export default async function BibliotecaLayout({ children }: { children: ReactNode }) {
  const user = await getOptionalUser()

  return (
    <BibliotecaThemeProvider>
      <BibliotecaHeader user={user} />
      {children}
      <BibliotecaToaster />
    </BibliotecaThemeProvider>
  )
}
