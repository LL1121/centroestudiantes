import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { getOptionalUser } from '@/lib/api/auth'
import { bibHref } from '@/lib/biblioteca-path'

import { SeguridadPanel } from './seguridad-panel'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Seguridad · Biblioteca Digital',
}

export default async function SeguridadPage() {
  const user = await getOptionalUser()
  if (!user) {
    redirect(`${bibHref('/biblioteca/login')}?redirect=${bibHref('/biblioteca/cuenta/seguridad')}`)
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <Link
        href={bibHref('/biblioteca')}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Volver
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-bold text-navy">Seguridad de la cuenta</h1>
      <div className="mt-6">
        <SeguridadPanel user={user} />
      </div>
    </div>
  )
}
