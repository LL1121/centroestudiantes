'use client'

import { FileText, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { configurePdfWorkerOn, pdfDocumentOptions } from '@/lib/pdf-worker'

interface Props {
  fileUrl: string
}

/**
 * Render del primer page del PDF para usar como portada en cards.
 *
 * Vive en su propio archivo y se carga con `next/dynamic({ ssr: false })` para
 * evitar que Turbopack arme un chunk SSR de `pdfjs-dist`. Si lo embebíamos en
 * un client component compartido con el catálogo, Next igual evaluaba pdfjs en
 * server y reventaba con `DOMMatrix is not defined`.
 */
export function PdfThumbnail({ fileUrl }: Props) {
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
        if (entries.some((e) => e.isIntersecting)) {
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
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center bg-white dark:bg-zinc-200"
    >
      {errored ? (
        <FallbackTile />
      ) : !visible || !PdfPieces || !width ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <PdfPieces.Document
          file={{ url: fileUrl }}
          loading={<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          error={<FallbackTile />}
          onLoadError={() => setErrored(true)}
          onSourceError={() => setErrored(true)}
          externalLinkTarget="_blank"
          options={pdfDocumentOptions(PdfPieces.pdfjs.version)}
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

function FallbackTile() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-muted/40 to-secondary text-muted-foreground">
      <FileText className="h-7 w-7" aria-hidden />
      <span className="text-[10px] font-semibold uppercase tracking-wider">PDF</span>
    </div>
  )
}
