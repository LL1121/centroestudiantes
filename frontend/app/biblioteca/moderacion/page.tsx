import { redirect } from 'next/navigation'

import { getOptionalUser } from '@/lib/api/auth'
import { bibHref } from '@/lib/biblioteca-path'

import { ModeracionQueue } from './moderacion-queue'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Moderación · Biblioteca Digital',
}

export default async function ModeracionPage() {
  const user = await getOptionalUser()
  if (!user) {
    redirect(`${bibHref('/biblioteca/login')}?redirect=${bibHref('/biblioteca/moderacion')}`)
  }
  if (user.role !== 'admin' && user.role !== 'moderador') {
    redirect(bibHref('/biblioteca'))
  }

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-navy">Cola de moderación</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Materiales detectados con contenido explícito o enlaces bloqueados.
      </p>
      <div className="mt-6">
        <ModeracionQueue />
      </div>
    </div>
  )
}
