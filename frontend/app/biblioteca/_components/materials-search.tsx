'use client'

import { Loader2, Search, Sparkles, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'

import { bibHref } from '@/lib/biblioteca-path'

interface Props {
  suggestedTags: string[]
}

export function MaterialsSearch({ suggestedTags }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [carrera, setCarrera] = useState(searchParams.get('carrera') ?? '')
  const [tag, setTag] = useState(searchParams.get('tag') ?? searchParams.get('tema') ?? '')
  const [semantic, setSemantic] = useState(searchParams.get('semantic') !== '0')

  useEffect(() => {
    setQ(searchParams.get('q') ?? '')
    setCarrera(searchParams.get('carrera') ?? '')
    setTag(searchParams.get('tag') ?? searchParams.get('tema') ?? '')
    setSemantic(searchParams.get('semantic') !== '0')
  }, [searchParams])

  const applySearch = useCallback(
    (overrides?: { q?: string; carrera?: string; tag?: string; semantic?: boolean }) => {
      const params = new URLSearchParams()
      const nextQ = (overrides?.q ?? q).trim()
      const nextCarrera = (overrides?.carrera ?? carrera).trim()
      const nextTag = (overrides?.tag ?? tag).trim()
      const nextSemantic = overrides?.semantic ?? semantic

      if (nextQ) params.set('q', nextQ)
      if (nextCarrera) params.set('carrera', nextCarrera)
      if (nextTag) params.set('tag', nextTag)
      if (!nextSemantic) params.set('semantic', '0')

      const qs = params.toString()
      startTransition(() => {
        router.push(qs ? `${bibHref('/biblioteca')}?${qs}` : bibHref('/biblioteca'))
      })
    },
    [q, carrera, tag, semantic, router],
  )

  const clearAll = () => {
    setQ('')
    setCarrera('')
    setTag('')
    setSemantic(true)
    startTransition(() => router.push(bibHref('/biblioteca')))
  }

  const hasFilters = Boolean(q.trim() || carrera.trim() || tag.trim())

  return (
    <form
      className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault()
        applySearch()
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, materia o tema…"
            className="block h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary sm:text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field label="Materia / carrera">
          <input
            type="text"
            value={carrera}
            onChange={(e) => setCarrera(e.target.value)}
            placeholder="Ej. Ingeniería, Derecho…"
            className={inputClass}
          />
        </Field>
        <Field label="Tema (tag)">
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Ej. parcial, anatomía…"
            className={inputClass}
            list="biblioteca-tag-suggestions"
          />
          <datalist id="biblioteca-tag-suggestions">
            {suggestedTags.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={semantic}
          onChange={(e) => setSemantic(e.target.checked)}
          className="size-3.5 rounded border-border accent-primary"
        />
        <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden />
        Incluir similitud semántica (contenido indexado)
      </label>

      {suggestedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Temas:
          </span>
          {suggestedTags.slice(0, 12).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTag(t)
                applySearch({ tag: t })
              }}
              className="min-h-9 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-[11px] font-medium text-navy transition-colors hover:border-primary/40 hover:bg-primary/10"
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <X className="h-3.5 w-3.5" />
          Limpiar filtros
        </button>
      )}
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'block h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary sm:h-10 sm:text-sm'
