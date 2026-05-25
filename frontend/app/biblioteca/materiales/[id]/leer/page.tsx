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
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <Link
          href="/biblioteca/materiales"
          className="inline-flex min-h-10 items-center gap-1 self-start text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver al catálogo
        </Link>
        <p className="text-sm text-muted-foreground sm:truncate sm:text-right">
          <span className="line-clamp-2 font-medium text-navy sm:line-clamp-1 sm:inline">
            {material.titulo}
          </span>
          <span className="hidden sm:inline"> · </span>
          <span className="block text-xs sm:inline sm:text-sm">{material.carrera}</span>
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
