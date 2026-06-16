import { cache } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { getOptionalUser } from '@/lib/api/auth'
import { serverFetch, ApiRequestError } from '@/lib/api/server'
import type { MaterialRead, MaterialSearchRead } from '@/lib/api/types'
import { bibHref } from '@/lib/biblioteca-path'
import { materialCarreraLabel } from '@/lib/material-labels'

import { CitationButton } from '../../../_components/citation-button'
import { CopyrightReportDialog } from '../../../_components/copyright-report-dialog'
import { isCopyrightEnabled } from '@/lib/copyright'
import { ReaderChatFab } from '../../../_components/reader-chat-fab'
import { SimilarMaterials } from '../../../_components/similar-materials'
import { MaterialViewer } from './material-viewer'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * `cache()` deduplica la request dentro del mismo render (Next 16 RSC).
 * Sin esto, `generateMetadata` y la page disparan dos requests al backend.
 */
const loadMaterial = cache(async (id: string): Promise<MaterialRead | null> => {
  try {
    return await serverFetch<MaterialRead>(`/api/v1/materials/${id}`, { authenticated: false })
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null
    throw error
  }
})

const loadSimilar = cache(async (id: string): Promise<MaterialSearchRead[]> => {
  try {
    return await serverFetch<MaterialSearchRead[]>(
      `/api/v1/materials/${id}/similar?limit=6`,
      { authenticated: false },
    )
  } catch {
    return []
  }
})

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const material = await loadMaterial(id)
  return { title: material ? `${material.titulo} · Visor` : 'Visor · Biblioteca Digital' }
}

export default async function LeerPage({ params }: PageProps) {
  const { id } = await params
  const [material, similar, user] = await Promise.all([
    loadMaterial(id),
    loadSimilar(id),
    getOptionalUser(),
  ])
  if (!material) notFound()
  const isGuest = user === null
  const ready = material.status === 'active' || material.status === 'indexed'

  const fileUrl = `/api/materials/${material.id}/file`

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <Link
          href={bibHref('/biblioteca')}
          className="inline-flex min-h-10 items-center gap-1 self-start text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver al catálogo
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <p className="text-sm text-muted-foreground sm:truncate sm:text-right">
            <span className="line-clamp-2 font-medium text-navy sm:line-clamp-1 sm:inline">
              {material.titulo}
            </span>
            <span className="hidden sm:inline"> · </span>
            <span className="block text-xs sm:inline sm:text-sm">{materialCarreraLabel(material.carrera)}</span>
          </p>
          <CitationButton materialId={material.id} titulo={material.titulo} />
        </div>
      </div>

      <MaterialViewer
        fileUrl={fileUrl}
        tipo={material.tipo_archivo}
        titulo={material.titulo}
      />

      <SimilarMaterials items={similar} />

      {ready && isCopyrightEnabled() && (
        <footer className="mt-4 flex flex-col items-center gap-2 border-t border-border pt-4 text-center">
          <p className="text-[11px] text-muted-foreground">
            Material subido por la comunidad del Centro de Estudiantes. El acceso no transfiere
            derechos sobre la obra.
          </p>
          <CopyrightReportDialog materialId={material.id} materialTitle={material.titulo} />
        </footer>
      )}

      {ready && (
        <ReaderChatFab materialId={material.id} titulo={material.titulo} isGuest={isGuest} />
      )}
    </div>
  )
}
