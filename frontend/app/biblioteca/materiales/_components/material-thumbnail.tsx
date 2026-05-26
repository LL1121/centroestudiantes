'use client'

import { BookOpen, FileImage, FileText, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { TipoArchivo } from '@/lib/api/types'
import { configurePdfWorkerOn, pdfDocumentOptions } from '@/lib/pdf-worker'

interface Props {
  materialId: string
  tipo: TipoArchivo
  titulo: string
  ready: boolean
}

/**
 * Preview chico del documento para mostrar en las cards del catálogo.
 * - PDF: primer page renderizado con react-pdf (lazy via IntersectionObserver).
 * - JPEG/PNG: <img> sirve directo del backend.
 * - EPUB: gradient + icono (la librería de epub es muy pesada para una tarjeta).
 *
 * `ready` evita renderizar el visor para materiales todavía en procesamiento.
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

function PdfThumbnail({ fileUrl }: { fileUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState<number | null>(null)
  const [errored, setErrored] = useState(false)
  const [PdfPieces, setPdfPieces] = useState<typeof import('react-pdf') | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const io = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((e) => e.isIntersecting)
        if (isVisible) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || PdfPieces) return
    let cancelled = false
    void (async () => {
      const mod = await import('react-pdf')
      await import('react-pdf/dist/Page/AnnotationLayer.css')
      await import('react-pdf/dist/Page/TextLayer.css')
      if (cancelled) return
      configurePdfWorkerOn(mod.pdfjs)
      setPdfPieces(mod)
    })()
    return () => {
      cancelled = true
    }
  }, [visible, PdfPieces])

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth)
    })
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0 flex items-center justify-center bg-white">
      {errored ? (
        <FallbackTile label="PDF" />
      ) : !visible || !PdfPieces || !width ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <PdfPieces.Document
          file={{ url: fileUrl }}
          loading={<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          error={<FallbackTile label="PDF" />}
          onLoadError={() => setErrored(true)}
          onSourceError={() => setErrored(true)}
          externalLinkTarget="_blank"
          options={pdfDocumentOptions()}
        >
          <PdfPieces.Page
            pageNumber={1}
            width={width}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            loading={<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            onRenderError={() => setErrored(true)}
          />
        </PdfPieces.Document>
      )}
    </div>
  )
}

function FallbackTile({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-muted/40 to-secondary text-muted-foreground">
      <FileText className="h-7 w-7" aria-hidden />
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </div>
  )
}
