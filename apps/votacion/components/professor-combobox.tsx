'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'

import type { Profesor } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  professors: Profesor[]
  value: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
  error?: string | null
}

export function ProfessorCombobox({
  professors,
  value,
  onChange,
  disabled,
  error,
}: Props) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = professors.find((p) => p.id === value) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return professors
    return professors.filter((p) => p.nombre.toLowerCase().includes(q))
  }, [professors, query])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor="profesor-search" className="mb-1.5 block text-sm font-medium text-navy">
        Profesor
      </label>
      <button
        type="button"
        id="profesor-search"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex h-12 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 text-left text-sm transition-colors',
          error ? 'border-destructive' : 'border-input',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          disabled && 'opacity-60',
        )}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected?.nombre ?? 'Buscá y elegí un profesor'}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-border bg-white shadow-lg"
          role="listbox"
          id={listId}
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribí el nombre…"
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">Sin coincidencias</li>
            ) : (
              filtered.map((profesor) => {
                const isSelected = profesor.id === value
                return (
                  <li key={profesor.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted',
                        isSelected && 'bg-primary/5 text-navy',
                      )}
                      onClick={() => {
                        onChange(profesor.id)
                        setQuery('')
                        setOpen(false)
                      }}
                    >
                      <span className="flex-1 truncate">{profesor.nombre}</span>
                      {isSelected && <Check className="h-4 w-4 text-primary" aria-hidden />}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  )
}
