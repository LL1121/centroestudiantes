'use client'

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Worker servido por CDN; usa la misma versión que la lib del paquete.
// Se evita configurar Webpack/Turbopack para resolver el .mjs y mantener el deploy simple.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`

interface Props {
  fileUrl: string
  titulo: string
}

const ZOOM_STEP = 0.2
const MIN_SCALE = 0.5
const MAX_SCALE = 3

export function PdfViewer({ fileUrl, titulo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [width, setWidth] = useState<number | null>(null)

  type PdfDoc = Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>
  const [matches, setMatches] = useState<number[]>([])
  const [matchIdx, setMatchIdx] = useState(0)
  const [searching, setSearching] = useState(false)
  const documentRef = useRef<PdfDoc | null>(null)

  const fileSpec = useMemo(() => ({ url: fileUrl }), [fileUrl])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(w)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const onDocumentLoad = (doc: PdfDoc) => {
    documentRef.current = doc
    setNumPages(doc.numPages)
    setLoading(false)
  }

  const onDocumentError = (err: Error) => {
    setError(err.message || 'No pudimos cargar el PDF')
    setLoading(false)
  }

  const goPrev = () => setPageNumber((p) => Math.max(1, p - 1))
  const goNext = () =>
    setPageNumber((p) => Math.min(numPages ?? p, p + 1))
  const zoomIn = () =>
    setScale((s) => Math.min(MAX_SCALE, +(s + ZOOM_STEP).toFixed(2)))
  const zoomOut = () =>
    setScale((s) => Math.max(MIN_SCALE, +(s - ZOOM_STEP).toFixed(2)))

  const runSearch = async (raw: string) => {
    const q = raw.trim().toLowerCase()
    if (!q || !numPages) {
      setMatches([])
      setMatchIdx(0)
      return
    }
    const doc = documentRef.current
    if (!doc) return
    setSearching(true)
    try {
      const found: number[] = []
      // Recorrido lineal: por la cantidad de páginas típicas de un apunte
      // (decenas a cientos) y operar en cliente, alcanza con buscar el string
      // en el texto plano de cada página. Si el material crece mucho podemos
      // mover esto al backend usando los chunks existentes en pgvector.
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p)
        const content = await page.getTextContent()
        const flat = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .toLowerCase()
        if (flat.includes(q)) found.push(p)
      }
      setMatches(found)
      setMatchIdx(0)
      if (found.length > 0) setPageNumber(found[0]!)
    } finally {
      setSearching(false)
    }
  }

  const goNextMatch = () => {
    if (matches.length === 0) return
    const next = (matchIdx + 1) % matches.length
    setMatchIdx(next)
    setPageNumber(matches[next]!)
  }

  const goPrevMatch = () => {
    if (matches.length === 0) return
    const prev = (matchIdx - 1 + matches.length) % matches.length
    setMatchIdx(prev)
    setPageNumber(matches[prev]!)
  }

  const closeSearch = () => {
    setShowSearch(false)
    setSearch('')
    setMatches([])
    setMatchIdx(0)
  }

  // Resaltado custom del término en la text layer de la página actual.
  const customTextRenderer = useMemo(() => {
    if (!search.trim()) return undefined
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(${escaped})`, 'gi')
    return ({ str }: { str: string }) =>
      str.replace(re, '<mark class="biblioteca-pdf-mark">$1</mark>')
  }, [search])

  return (
    <section className="mt-3 flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card shadow-sm sm:mt-4">
      <Toolbar
        pageNumber={pageNumber}
        numPages={numPages}
        scale={scale}
        showSearch={showSearch}
        onPrev={goPrev}
        onNext={goNext}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onToggleSearch={() => setShowSearch((v) => !v)}
        fileUrl={fileUrl}
      />

      {showSearch && (
        <SearchBar
          value={search}
          onChange={setSearch}
          onSubmit={runSearch}
          searching={searching}
          matches={matches}
          matchIdx={matchIdx}
          onPrevMatch={goPrevMatch}
          onNextMatch={goNextMatch}
          onClose={closeSearch}
        />
      )}

      <div
        ref={containerRef}
        className="biblioteca-pdf-scroll flex flex-1 items-start justify-center overflow-auto rounded-b-2xl bg-secondary/40 p-3"
      >
        {error ? (
          <div className="flex flex-1 items-center justify-center text-sm text-destructive">
            {error}
          </div>
        ) : (
          <Document
            file={fileSpec}
            onLoadSuccess={onDocumentLoad}
            onLoadError={onDocumentError}
            loading={
              <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Abriendo PDF…
              </div>
            }
            error={
              <div className="text-sm text-destructive">
                No pudimos abrir el PDF.
              </div>
            }
            externalLinkTarget="_blank"
            options={{ cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`, cMapPacked: true }}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              width={width ?? undefined}
              renderTextLayer
              renderAnnotationLayer
              customTextRenderer={customTextRenderer}
              className="biblioteca-pdf-page"
              loading={
                <div className="flex h-[40vh] items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Renderizando página…
                </div>
              }
            />
          </Document>
        )}
        {loading && !error && (
          <p className="sr-only" aria-live="polite">
            Cargando {titulo}
          </p>
        )}
      </div>

      <style jsx global>{`
        .biblioteca-pdf-page {
          background: var(--card);
          box-shadow: 0 4px 16px rgba(10, 61, 98, 0.08);
          border-radius: 12px;
          overflow: hidden;
        }
        .biblioteca-pdf-mark {
          background: rgba(198, 161, 101, 0.45);
          color: inherit;
          padding: 0;
          border-radius: 2px;
        }
        .dark .biblioteca-pdf-page {
          filter: invert(0.92) hue-rotate(180deg);
        }
        .dark .biblioteca-pdf-mark {
          background: rgba(198, 161, 101, 0.7);
        }
      `}</style>
    </section>
  )
}

interface ToolbarProps {
  pageNumber: number
  numPages: number | null
  scale: number
  showSearch: boolean
  onPrev: () => void
  onNext: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleSearch: () => void
  fileUrl: string
}

function Toolbar({
  pageNumber,
  numPages,
  scale,
  showSearch,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onToggleSearch,
  fileUrl,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-2 sm:px-4">
      <ToolbarButton onClick={onPrev} disabled={pageNumber <= 1} aria-label="Anterior">
        <ChevronLeft className="h-4 w-4" />
      </ToolbarButton>
      <span className="text-xs tabular-nums text-muted-foreground">
        {pageNumber} / {numPages ?? '…'}
      </span>
      <ToolbarButton
        onClick={onNext}
        disabled={!numPages || pageNumber >= numPages}
        aria-label="Siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </ToolbarButton>

      <span className="mx-2 hidden h-5 w-px bg-border sm:inline-block" />

      <ToolbarButton onClick={onZoomOut} disabled={scale <= MIN_SCALE} aria-label="Reducir">
        <ZoomOut className="h-4 w-4" />
      </ToolbarButton>
      <span className="text-xs tabular-nums text-muted-foreground">
        {Math.round(scale * 100)}%
      </span>
      <ToolbarButton onClick={onZoomIn} disabled={scale >= MAX_SCALE} aria-label="Ampliar">
        <ZoomIn className="h-4 w-4" />
      </ToolbarButton>

      <span className="mx-2 hidden h-5 w-px bg-border sm:inline-block" />

      <ToolbarButton
        onClick={onToggleSearch}
        aria-label={showSearch ? 'Cerrar búsqueda' : 'Buscar en el documento'}
        active={showSearch}
      >
        <Search className="h-4 w-4" />
      </ToolbarButton>

      <a
        href={fileUrl}
        download
        className="inline-flex h-10 w-full basis-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-navy transition-colors hover:border-primary/40 sm:ml-auto sm:h-8 sm:w-auto sm:basis-auto"
      >
        <Download className="h-3.5 w-3.5" />
        Descargar
      </a>
    </div>
  )
}

interface SearchBarProps {
  value: string
  onChange: (next: string) => void
  onSubmit: (q: string) => void
  searching: boolean
  matches: number[]
  matchIdx: number
  onPrevMatch: () => void
  onNextMatch: () => void
  onClose: () => void
}

function SearchBar({
  value,
  onChange,
  onSubmit,
  searching,
  matches,
  matchIdx,
  onPrevMatch,
  onNextMatch,
  onClose,
}: SearchBarProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(value)
      }}
      className="flex flex-col gap-2 border-b border-border bg-secondary/40 px-2 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:px-4"
    >
      <div className="flex w-full items-center gap-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar en el PDF…"
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary sm:h-8 sm:text-sm"
          autoFocus
        />
      </div>
      <button
        type="submit"
        disabled={searching || !value.trim()}
        className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 sm:h-8 sm:w-auto sm:text-xs"
      >
        {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Buscar'}
      </button>
      {matches.length > 0 ? (
        <div className="flex items-center gap-1">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {matchIdx + 1} / {matches.length} págs.
          </span>
          <ToolbarButton onClick={onPrevMatch} aria-label="Coincidencia anterior" type="button">
            <ChevronLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={onNextMatch} aria-label="Coincidencia siguiente" type="button">
            <ChevronRight className="h-4 w-4" />
          </ToolbarButton>
        </div>
      ) : value.trim() && !searching ? (
        <span className="text-[11px] text-muted-foreground">Sin resultados</span>
      ) : null}
      <ToolbarButton onClick={onClose} aria-label="Cerrar búsqueda" type="button">
        <X className="h-4 w-4" />
      </ToolbarButton>
    </form>
  )
}

function ToolbarButton({
  active,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border text-navy transition-colors disabled:opacity-50 sm:h-8 sm:w-8 ${
        active
          ? 'border-primary/40 bg-primary/10'
          : 'border-border bg-background hover:border-primary/40'
      }`}
    >
      {children}
    </button>
  )
}
