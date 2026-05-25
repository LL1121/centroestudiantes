import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { serverFetch, ApiRequestError } from '@/lib/api/server'
import type { MaterialRead } from '@/lib/api/types'

import { MaterialViewer } from './material-viewer'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

async function loadMaterial(id: string): Promise<MaterialRead | null> {
  try {
    const list = await serverFetch<MaterialRead[]>(
      `/api/v1/materials?limit=100&semantic=false`,
      { authenticated: false },
    )
    return list.find((m) => m.id === id) ?? null
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null
    throw error
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const material = await loadMaterial(id)
  return { title: material ? `${material.titulo} · Visor` : 'Visor · Biblioteca Digital' }
}

export default async function LeerPage({ params }: PageProps) {
  const { id } = await params
  const material = await loadMaterial(id)
  if (!material) notFound()

  const fileUrl = `/api/materials/${material.id}/file`

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-3 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/biblioteca/materiales"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver al catálogo
        </Link>
        <p className="truncate text-xs text-muted-foreground sm:text-sm">
          <span className="font-medium text-navy">{material.titulo}</span>
          {' · '}
          <span>{material.carrera}</span>
        </p>
      </div>

      <MaterialViewer
        fileUrl={fileUrl}
        tipo={material.tipo_archivo}
        titulo={material.titulo}
      />
    </div>
  )
}
