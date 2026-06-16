'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

import { ReadingThemeToggle } from '@/app/biblioteca/_components/reading-theme-toggle'
import type { TipoArchivo } from '@/lib/api/types'
import { loadReadingTheme, saveReadingTheme, type ReadingTheme } from '@/lib/reading-theme'

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
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>('light')

  useEffect(() => {
    setReadingTheme(loadReadingTheme())
  }, [])

  const onThemeChange = (next: ReadingTheme) => {
    setReadingTheme(next)
    saveReadingTheme(next)
  }

  const viewer = (() => {
    switch (tipo) {
      case 'pdf':
        return <PdfViewer fileUrl={fileUrl} titulo={titulo} readingTheme={readingTheme} />
      case 'epub':
        return <EpubViewer fileUrl={fileUrl} titulo={titulo} readingTheme={readingTheme} />
      case 'jpeg':
      case 'png':
        return <ImageViewer fileUrl={fileUrl} titulo={titulo} readingTheme={readingTheme} />
      default:
        return (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            Formato no soportado para visualizar en línea.
          </div>
        )
    }
  })()

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col sm:mt-4">
      <div className="mb-2 flex justify-end">
        <ReadingThemeToggle value={readingTheme} onChange={onThemeChange} />
      </div>
      {viewer}
    </div>
  )
}

function ViewerLoading({ label }: { label: string }) {
  return (
    <div className="mt-6 flex h-[70vh] items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
      {label}
    </div>
  )
}
