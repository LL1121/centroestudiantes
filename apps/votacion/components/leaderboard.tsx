'use client'

import { useEffect, useState } from 'react'
import { Radio, Trophy } from 'lucide-react'

import type { LeaderboardEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  initialEntries?: LeaderboardEntry[]
  intervalMs?: number
}

const EMPTY_SLOTS = 10

export function Leaderboard({ initialEntries = [], intervalMs = 5000 }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries)
  const [loading, setLoading] = useState(initialEntries.length === 0)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false
    let id: number | null = null

    const load = async () => {
      try {
        const res = await fetch('/api/voting/leaderboard', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as LeaderboardEntry[]
        if (!cancelled) {
          setEntries(data)
          setUpdatedAt(new Date())
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const start = () => {
      if (id !== null) return
      void load()
      id = window.setInterval(() => void load(), intervalMs)
    }
    const stop = () => {
      if (id === null) return
      window.clearInterval(id)
      id = null
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start()
      else stop()
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [intervalMs])

  const rows =
    entries.length > 0
      ? entries
      : Array.from({ length: EMPTY_SLOTS }, (_, i) => null)

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-navy/[0.03] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" aria-hidden />
          <div>
            <h2 className="font-serif text-lg font-bold text-navy">Ranking en vivo</h2>
            <p className="text-xs text-muted-foreground">Top 10 · se actualiza solo</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
          <Radio className="h-3 w-3 animate-pulse" aria-hidden />
          En vivo
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-semibold sm:px-5">#</th>
              <th className="px-2 py-2.5 font-semibold">Profesor</th>
              <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Votos</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/70">
                  <td colSpan={3} className="px-4 py-3 sm:px-5">
                    <div className="h-5 animate-pulse rounded bg-muted" />
                  </td>
                </tr>
              ))
            ) : (
              rows.map((entry, index) => {
                const puesto = entry?.puesto ?? index + 1
                const isLeader = puesto === 1 && entry
                return (
                  <tr
                    key={entry?.profesor_id ?? `empty-${puesto}`}
                    className={cn(
                      'border-b border-border/70 last:border-0',
                      isLeader && 'bg-accent/10',
                      entry && puesto <= 3 && !isLeader && 'bg-primary/[0.03]',
                    )}
                  >
                    <td className="w-14 px-4 py-3 align-middle sm:px-5">
                      <span
                        className={cn(
                          'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                          puesto === 1
                            ? 'bg-accent text-accent-foreground'
                            : puesto <= 3
                              ? 'bg-primary/15 text-primary'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {puesto}
                      </span>
                    </td>
                    <td className="px-2 py-3 align-middle">
                      {entry ? (
                        <p className="font-semibold text-navy">{entry.nombre}</p>
                      ) : (
                        <p className="text-muted-foreground">—</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right align-middle tabular-nums sm:px-5">
                      {entry ? (
                        <span className="font-bold text-primary">{entry.votos}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground sm:px-5">
        {entries.length === 0 && !loading
          ? 'Todavía no hay votos. ¡Sé el primero en participar!'
          : updatedAt
            ? `Última actualización: ${updatedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
            : 'Actualizando…'}
      </div>
    </section>
  )
}
