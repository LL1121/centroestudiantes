'use client'

import dynamic from 'next/dynamic'

import type { TipoArchivo } from '@/lib/api/types'

import { ImageViewer } from './image-viewer'

const PdfViewer = dynamic(
  () => import('./pdf-viewer').then((mod) => mod.PdfViewer),
  {
    ssr: false,
    loading: () => <ViewerLoading label="Cargando visor PDF…" />,
  },
)

const EpubViewer = dynamic(
  () => import('./epub-viewer').then((mod) => mod.EpubViewer),
  {
    ssr: false,
    loading: () => <ViewerLoading label="Cargando lector EPUB…" />,
  },
)

interface Props {
  fileUrl: string
  tipo: TipoArchivo
  titulo: string
}

export function MaterialViewer({ fileUrl, tipo, titulo }: Props) {
  switch (tipo) {
    case 'pdf':
      return <PdfViewer fileUrl={fileUrl} titulo={titulo} />
    case 'epub':
      return <EpubViewer fileUrl={fileUrl} titulo={titulo} />
    case 'jpeg':
    case 'png':
      return <ImageViewer fileUrl={fileUrl} titulo={titulo} />
    default:
      return (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Formato no soportado para visualizar en línea.
        </div>
      )
  }
}

function ViewerLoading({ label }: { label: string }) {
  return (
    <div className="mt-6 flex h-[70vh] items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
      {label}
    </div>
  )
}
