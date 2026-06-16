'use client'

import dynamic from 'next/dynamic'
import { BookOpen, FileImage, FileText, Loader2 } from 'lucide-react'

import type { TipoArchivo } from '@/lib/api/types'

const PdfThumbnail = dynamic(
  () => import('./pdf-thumbnail').then((mod) => mod.PdfThumbnail),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-zinc-200">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ),
  },
)

interface Props {
  materialId: string
  tipo: TipoArchivo
  titulo: string
  ready: boolean
}

/**
 * Preview chico del documento para mostrar en las cards del catálogo.
 * - PDF: primer page renderizado por `PdfThumbnail` (cliente puro, lazy).
 * - JPEG/PNG: <img> sirve directo del backend.
 * - EPUB / no-ready: gradient + icono.
 */
export function MaterialThumbnail({ materialId, tipo, titulo, ready }: Props) {
  const fileUrl = `/api/materials/${materialId}/file`

  if (tipo === 'jpeg' || tipo === 'png') {
    return (
      <ThumbnailFrame tone="image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={`Vista previa de ${titulo}`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </ThumbnailFrame>
    )
  }

  if (tipo === 'epub') {
    return (
      <ThumbnailFrame tone="epub">
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-primary/15 via-secondary to-gold/20 p-3 text-center">
          <BookOpen className="h-7 w-7 text-primary" aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">EPUB</span>
        </div>
      </ThumbnailFrame>
    )
  }

  if (tipo === 'pdf' && ready) {
    return (
      <ThumbnailFrame tone="pdf">
        <PdfThumbnail fileUrl={fileUrl} />
      </ThumbnailFrame>
    )
  }

  return (
    <ThumbnailFrame tone="generic">
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-muted/40 to-secondary p-3 text-center">
        {tipo === 'pdf' ? (
          <FileText className="h-7 w-7 text-muted-foreground" aria-hidden />
        ) : (
          <FileImage className="h-7 w-7 text-muted-foreground" aria-hidden />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {tipo.toUpperCase()}
        </span>
      </div>
    </ThumbnailFrame>
  )
}

function ThumbnailFrame({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'pdf' | 'epub' | 'image' | 'generic'
}) {
  const toneClass: Record<string, string> = {
    pdf: 'ring-1 ring-primary/15',
    epub: 'ring-1 ring-gold/30',
    image: 'ring-1 ring-emerald-500/20',
    generic: 'ring-1 ring-border',
  }
  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-secondary/40 shadow-sm ${toneClass[tone]}`}
    >
      {children}
    </div>
  )
}
