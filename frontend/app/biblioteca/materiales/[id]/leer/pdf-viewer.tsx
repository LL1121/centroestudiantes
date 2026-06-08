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
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'

import { configurePdfWorkerOn, pdfDocumentOptions } from '@/lib/pdf-worker'
import { READING_SURFACE, type ReadingTheme } from '@/lib/reading-theme'

interface Props {
  fileUrl: string
  titulo: string
  readingTheme: ReadingTheme
}

type ReactPdfModule = typeof import('react-pdf')

type PdfDocument = Awaited<
  ReturnType<ReactPdfModule['pdfjs']['getDocument']>['promise']
>

const ZOOM_STEP = 0.2
const MIN_SCALE = 0.5
const MAX_SCALE = 3

export function PdfViewer({ fileUrl, titulo, readingTheme }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdf, setPdf] = useState<ReactPdfModule | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.1)
  const deferredScale = useDeferredValue(scale)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [width, setWidth] = useState<number | null>(null)
  const [pagePending, startPageTransition] = useTransition()

  const [matches, setMatches] = useState<number[]>([])
  const [matchIdx, setMatchIdx] = useState(0)
  const [searching, setSearching] = useState(false)
  const documentRef = useRef<PdfDocument | null>(null)

  const fileSpec = useMemo(() => ({ url: fileUrl }), [fileUrl])
  const pageWidth = width ? Math.round(width * deferredScale) : undefined
  const textLayerEnabled = showSearch && search.trim().length > 0
  const zoomPending = scale !== deferredScale

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const mod = await import('react-pdf')
      await import('react-pdf/dist/Page/AnnotationLayer.css')
      await import('react-pdf/dist/Page/TextLayer.css')
      if (cancelled) return
      configurePdfWorkerOn(mod.pdfjs)
      setPdf(mod)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(w)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const onDocumentLoad = useCallback((doc: PdfDocument) => {
    documentRef.current = doc
    setNumPages(doc.numPages)
    setLoading(false)
  }, [])

  const onDocumentError = useCallback((err: Error) => {
    setError(err.message || 'No pudimos cargar el PDF')
    setLoading(false)
  }, [])

  const goPrev = () =>
    startPageTransition(() => setPageNumber((p) => Math.max(1, p - 1)))
  const goNext = () =>
    startPageTransition(() =>
      setPageNumber((p) => Math.min(numPages ?? p, p + 1)),
    )
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
      if (found.length > 0) {
        startPageTransition(() => setPageNumber(found[0]!))
      }
    } finally {
      setSearching(false)
    }
  }

  const goNextMatch = () => {
    if (matches.length === 0) return
    const next = (matchIdx + 1) % matches.length
    setMatchIdx(next)
    startPageTransition(() => setPageNumber(matches[next]!))
  }

  const goPrevMatch = () => {
    if (matches.length === 0) return
    const prev = (matchIdx - 1 + matches.length) % matches.length
    setMatchIdx(prev)
    startPageTransition(() => setPageNumber(matches[prev]!))
  }

  const closeSearch = () => {
    setShowSearch(false)
    setSearch('')
    setMatches([])
    setMatchIdx(0)
  }

  const customTextRenderer = useMemo(() => {
    if (!textLayerEnabled) return undefined
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(${escaped})`, 'gi')
    return ({ str }: { str: string }) =>
      str.replace(re, '<mark class="biblioteca-pdf-mark">$1</mark>')
  }, [search, textLayerEnabled])

  const docOptions = useMemo(
    () => (pdf ? pdfDocumentOptions(pdf.pdfjs.version) : undefined),
    [pdf],
  )

  if (!pdf) {
    return (
      <section className="mt-3 flex min-h-[70vh] flex-1 items-center justify-center rounded-2xl border border-border bg-card sm:mt-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Preparando visor PDF…
        </p>
      </section>
    )
  }

  const { Document, Page } = pdf

  return (
    <section
      data-reading-theme={readingTheme}
      className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card shadow-sm"
    >
      <Toolbar
        pageNumber={pageNumber}
        numPages={numPages}
        scale={scale}
        zoomPending={zoomPending}
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
        className={`biblioteca-pdf-scroll flex flex-1 items-start justify-center overflow-auto rounded-b-2xl p-3 ${READING_SURFACE[readingTheme]}`}
      >
        {error ? (
          <div className="flex flex-1 items-center justify-center text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div
            className={`relative transition-opacity duration-150 ${pagePending || zoomPending ? 'opacity-80' : 'opacity-100'}`}
          >
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
              options={docOptions}
            >
              <Page
                key={`${pageNumber}-${pageWidth ?? 'auto'}`}
                pageNumber={pageNumber}
                width={pageWidth}
                renderTextLayer={textLayerEnabled}
                renderAnnotationLayer={false}
                customTextRenderer={customTextRenderer}
                className="biblioteca-pdf-page"
                loading={
                  <div className="flex h-[40vh] items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Renderizando página…
                  </div>
                }
              />
            </Document>
          </div>
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
        [data-reading-theme='dark'] .biblioteca-pdf-page {
          filter: invert(0.92) hue-rotate(180deg);
        }
        [data-reading-theme='dark'] .biblioteca-pdf-mark {
          background: rgba(198, 161, 101, 0.7);
        }
        [data-reading-theme='sepia'] .biblioteca-pdf-page {
          filter: sepia(0.35) saturate(0.9);
        }
      `}</style>
    </section>
  )
}

interface ToolbarProps {
  pageNumber: number
  numPages: number | null
  scale: number
  zoomPending: boolean
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
  zoomPending,
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
        {zoomPending && (
          <Loader2 className="ml-1 inline h-3 w-3 animate-spin align-middle" aria-hidden />
        )}
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
