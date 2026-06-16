import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { getOptionalUser } from '@/lib/api/auth'
import { bibHref } from '@/lib/biblioteca-path'

import { AdminUsersPanel } from './admin-users-panel'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Administración · Biblioteca Digital',
}

export default async function AdminPage() {
  const user = await getOptionalUser()
  if (!user) {
    redirect(`${bibHref('/biblioteca/login')}?redirect=${bibHref('/biblioteca/admin')}`)
  }
  if (user.role !== 'admin') {
    redirect(bibHref('/biblioteca'))
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href={bibHref('/biblioteca')}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Volver
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-bold text-navy">Panel de administración</h1>
      <p className="mt-1 text-sm text-muted-foreground">Gestión de usuarios y permisos.</p>
      <div className="mt-6">
        <AdminUsersPanel />
      </div>
    </div>
  )
}
