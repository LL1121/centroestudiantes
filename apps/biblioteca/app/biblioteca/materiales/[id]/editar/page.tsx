import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { cache } from 'react'

import { getOptionalUser } from '@/lib/api/auth'
import { serverFetch, ApiRequestError } from '@/lib/api/server'
import type { MaterialRead } from '@/lib/api/types'
import { bibHref } from '@/lib/biblioteca-path'

import { EditMaterialForm } from './edit-material-form'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

const loadMaterial = cache(async (id: string): Promise<MaterialRead | null> => {
  try {
    return await serverFetch<MaterialRead>(`/api/v1/materials/${id}`, { authenticated: false })
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null
    throw error
  }
})

function canEdit(user: NonNullable<Awaited<ReturnType<typeof getOptionalUser>>>, material: MaterialRead) {
  if (user.role === 'admin') return true
  return material.uploader_id === user.id
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const material = await loadMaterial(id)
  return { title: material ? `Editar · ${material.titulo}` : 'Editar material · Biblioteca Digital' }
}

export default async function EditarMaterialPage({ params }: PageProps) {
  const { id } = await params
  const [material, user] = await Promise.all([loadMaterial(id), getOptionalUser()])

  if (!material) notFound()
  if (!user) {
    redirect(`${bibHref('/biblioteca/login')}?redirect=${bibHref(`/biblioteca/materiales/${id}/editar`)}`)
  }
  if (!canEdit(user, material)) {
    redirect(bibHref('/biblioteca'))
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={bibHref('/biblioteca')}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Volver al catálogo
      </Link>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Biblioteca Digital</p>
        <h1 className="font-serif text-2xl font-bold text-navy sm:text-3xl">Editar material</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Modificá título, descripción, carrera, tags y metadata APA. El archivo no se reemplaza.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <EditMaterialForm material={material} />
      </div>
    </div>
  )
}
