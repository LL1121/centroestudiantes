import { Toaster } from 'sonner'
import type { ReactNode } from 'react'

import { getOptionalUser } from '@/lib/api/auth'

import { BibliotecaHeader } from './_components/biblioteca-header'

export const dynamic = 'force-dynamic'

export default async function BibliotecaLayout({ children }: { children: ReactNode }) {
  const user = await getOptionalUser()

  return (
    <div className="min-h-dvh bg-secondary/30">
      <BibliotecaHeader user={user} />
      {children}
      <Toaster richColors position="top-right" closeButton />
    </div>
  )
}
