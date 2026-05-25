'use client'

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useBibliotecaTheme } from '@/app/biblioteca/_components/biblioteca-theme-provider'

interface Props {
  fileUrl: string
  titulo: string
}

interface SearchHit {
  cfi: string
  excerpt: string
}

/**
 * Lector EPUB con paginación, búsqueda full-text y soporte de tema oscuro.
 * Usamos epub.js dinámicamente porque depende de APIs del DOM y no tiene
 * tipados oficiales para SSR.
 */
export function EpubViewer({ fileUrl, titulo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<EpubBook | null>(null)
  const renditionRef = useRef<EpubRendition | null>(null)
  const { theme } = useBibliotecaTheme()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [hits, setHits] = useState<SearchHit[]>([])

  useEffect(() => {
    let cancelled = false

    async function init() {
      const ePubModule = await import('epubjs')
      const ePub = (ePubModule as { default?: typeof ePubModule }).default ??
        (ePubModule as unknown as EpubFactory)
      const book = (ePub as EpubFactory)(fileUrl)
      if (cancelled) return
      bookRef.current = book

      try {
        await book.ready
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || 'No pudimos abrir el EPUB')
          setLoading(false)
        }
        return
      }

      if (!containerRef.current || cancelled) return
      const rendition = book.renderTo(containerRef.current, {
        width: '100%',
        height: '100%',
        flow: 'paginated',
        spread: 'auto',
        manager: 'default',
      })
      renditionRef.current = rendition

      try {
        await book.locations.generate(1024)
      } catch {
        // Si falla la generación de locations, seguimos: la barra de progreso
        // simplemente no avanza, pero la lectura funciona igual.
      }

      rendition.on('relocated', (loc) => {
        const percentage = (loc as { start?: { percentage?: number } }).start?.percentage
        if (typeof percentage === 'number') {
          setProgress(Math.round(percentage * 100))
        }
      })

      await rendition.display()
      if (!cancelled) setLoading(false)
    }

    void init()

    return () => {
      cancelled = true
      try {
        renditionRef.current?.destroy()
        bookRef.current?.destroy()
      } catch {
        // Ignoramos: es común que destroy() arroje si la promesa de carga
        // todavía estaba en vuelo cuando se desmontó el componente.
      }
      renditionRef.current = null
      bookRef.current = null
    }
  }, [fileUrl])

  // Re-aplicar el tema dentro del iframe del EPUB cada vez que cambie.
  useEffect(() => {
    const rendition = renditionRef.current
    if (!rendition) return
    const isDark = theme === 'dark'
    rendition.themes.register('biblioteca-light', {
      body: { background: '#ffffff', color: '#1a1a1a' },
      a: { color: '#0077cc' },
    })
    rendition.themes.register('biblioteca-dark', {
      body: { background: '#0b1624', color: '#eef4fa' },
      a: { color: '#4da3e8' },
      'p, li, h1, h2, h3, h4, h5, h6, span': { color: '#eef4fa !important' },
    })
    rendition.themes.select(isDark ? 'biblioteca-dark' : 'biblioteca-light')
  }, [theme, loading])

  const goPrev = () => renditionRef.current?.prev()
  const goNext = () => renditionRef.current?.next()

  const runSearch = async (raw: string) => {
    const q = raw.trim()
    const book = bookRef.current
    if (!q || !book) {
      setHits([])
      return
    }
    setSearching(true)
    try {
      const all: SearchHit[] = []
      for (const item of book.spine.spineItems) {
        try {
          await item.load(book.load.bind(book))
          const found = item.find(q) as Array<{ cfi: string; excerpt: string }>
          for (const f of found) all.push({ cfi: f.cfi, excerpt: f.excerpt })
          item.unload()
          if (all.length > 200) break
        } catch {
          // Algunos items del spine pueden fallar al cargarse; seguimos.
        }
      }
      setHits(all)
      if (all.length > 0 && renditionRef.current) {
        await renditionRef.current.display(all[0]!.cfi)
      }
    } finally {
      setSearching(false)
    }
  }

  const goToHit = async (cfi: string) => {
    if (!renditionRef.current) return
    await renditionRef.current.display(cfi)
  }

  const closeSearch = () => {
    setShowSearch(false)
    setSearch('')
    setHits([])
  }

  const memoHits = useMemo(() => hits.slice(0, 50), [hits])

  return (
    <section className="mt-3 flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card shadow-sm sm:mt-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-2 sm:px-4">
        <ToolbarButton onClick={goPrev} aria-label="Página anterior">
          <ChevronLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={goNext} aria-label="Página siguiente">
          <ChevronRight className="h-4 w-4" />
        </ToolbarButton>
        <span className="text-xs tabular-nums text-muted-foreground">{progress}%</span>

        <span className="mx-2 hidden h-5 w-px bg-border sm:inline-block" />

        <ToolbarButton
          onClick={() => setShowSearch((v) => !v)}
          active={showSearch}
          aria-label="Buscar en el libro"
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

      {showSearch && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void runSearch(search)
          }}
          className="flex flex-col gap-2 border-b border-border bg-secondary/40 px-2 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:px-4"
        >
          <div className="flex w-full items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en el libro…"
              className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary sm:h-8 sm:text-sm"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={searching || !search.trim()}
            className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 sm:h-8 sm:w-auto sm:text-xs"
          >
            {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Buscar'}
          </button>
          {hits.length > 0 && (
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {hits.length} resultados
            </span>
          )}
          <ToolbarButton onClick={closeSearch} aria-label="Cerrar búsqueda" type="button">
            <X className="h-4 w-4" />
          </ToolbarButton>
        </form>
      )}

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="relative min-h-[55dvh] flex-1 bg-secondary/30 sm:min-h-[70vh]">
          {error ? (
            <div className="flex h-full items-center justify-center text-sm text-destructive">
              {error}
            </div>
          ) : (
            <div ref={containerRef} className="absolute inset-0" aria-label={titulo} />
          )}
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/60 text-sm text-muted-foreground backdrop-blur-sm">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Abriendo libro…
            </div>
          )}
        </div>

        {showSearch && memoHits.length > 0 && (
          <aside className="max-h-[40vh] w-full overflow-auto border-t border-border bg-secondary/20 p-2 lg:max-h-none lg:max-w-xs lg:border-l lg:border-t-0">
            <ul className="space-y-1">
              {memoHits.map((hit, i) => (
                <li key={`${hit.cfi}-${i}`}>
                  <button
                    type="button"
                    onClick={() => void goToHit(hit.cfi)}
                    className="block w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-xs text-navy transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    {hit.excerpt}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </section>
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

// Tipados mínimos del subset de epub.js que usamos. La librería no provee
// tipos oficiales; con esto evitamos `any` esparcidos en el componente.
type EpubFactory = (url: string) => EpubBook

interface EpubBook {
  ready: Promise<unknown>
  spine: { spineItems: EpubSpineItem[] }
  locations: { generate(chars: number): Promise<unknown> }
  load(href: string): Promise<unknown>
  renderTo(element: HTMLElement, options: Record<string, unknown>): EpubRendition
  destroy(): void
}

interface EpubSpineItem {
  load(loader: (href: string) => unknown): Promise<unknown>
  unload(): void
  find(query: string): unknown
}

interface EpubRendition {
  display(target?: string): Promise<unknown>
  prev(): Promise<unknown>
  next(): Promise<unknown>
  on(event: string, handler: (payload: unknown) => void): void
  themes: {
    register(name: string, rules: Record<string, Record<string, string>>): void
    select(name: string): void
  }
  destroy(): void
}
