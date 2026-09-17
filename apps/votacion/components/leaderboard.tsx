'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion, useSpring, useTransform } from 'framer-motion'
import { Radio, Trophy } from 'lucide-react'

import type { LeaderboardEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  initialEntries?: LeaderboardEntry[]
  intervalMs?: number
}

const EMPTY_SLOTS = 10

function AnimatedVotes({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 90, damping: 18, mass: 0.6 })
  const display = useTransform(spring, (latest) => Math.round(latest).toLocaleString('es-AR'))
  const [text, setText] = useState(value.toLocaleString('es-AR'))

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  useEffect(() => {
    const unsubscribe = display.on('change', (latest) => setText(latest))
    return unsubscribe
  }, [display])

  return <motion.span className="font-bold text-primary tabular-nums">{text}</motion.span>
}

export function Leaderboard({ initialEntries = [], intervalMs = 2500 }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries)
  const [loading, setLoading] = useState(initialEntries.length === 0)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set())
  const prevRef = useRef<Map<string, { votos: number; puesto: number }>>(new Map())

  useEffect(() => {
    let cancelled = false
    let id: number | null = null

    const load = async () => {
      try {
        const res = await fetch('/api/voting/leaderboard', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as LeaderboardEntry[]
        if (cancelled) return

        const prev = prevRef.current
        const changed = new Set<string>()
        for (const entry of data) {
          const before = prev.get(entry.profesor_id)
          if (
            before &&
            (before.votos !== entry.votos || before.puesto !== entry.puesto)
          ) {
            changed.add(entry.profesor_id)
          }
        }
        prevRef.current = new Map(
          data.map((e) => [e.profesor_id, { votos: e.votos, puesto: e.puesto }]),
        )

        setEntries(data)
        setUpdatedAt(new Date())
        if (changed.size > 0) {
          setFlashIds(changed)
          window.setTimeout(() => {
            if (!cancelled) setFlashIds(new Set())
          }, 900)
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

  const rows: Array<LeaderboardEntry | null> =
    entries.length > 0
      ? entries
      : Array.from({ length: EMPTY_SLOTS }, () => null)

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
          <LayoutGroup>
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
                <AnimatePresence initial={false}>
                  {rows.map((entry, index) => {
                    const puesto = entry?.puesto ?? index + 1
                    const isLeader = puesto === 1 && Boolean(entry)
                    const rowKey = entry?.profesor_id ?? `empty-${puesto}`
                    const flashing = entry ? flashIds.has(entry.profesor_id) : false

                    return (
                      <motion.tr
                        key={rowKey}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          backgroundColor: flashing
                            ? 'rgba(34, 197, 94, 0.14)'
                            : isLeader
                              ? 'rgba(245, 158, 11, 0.1)'
                              : 'rgba(0, 0, 0, 0)',
                        }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{
                          layout: { type: 'spring', stiffness: 380, damping: 32 },
                          backgroundColor: { duration: 0.45 },
                        }}
                        className={cn(
                          'border-b border-border/70 last:border-0',
                          entry && puesto <= 3 && !isLeader && !flashing && 'bg-primary/[0.03]',
                        )}
                      >
                        <td className="w-14 px-4 py-3 align-middle sm:px-5">
                          <motion.span
                            layout
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
                          </motion.span>
                        </td>
                        <td className="px-2 py-3 align-middle">
                          {entry ? (
                            <p className="font-semibold text-navy">{entry.nombre}</p>
                          ) : (
                            <p className="text-muted-foreground">—</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right align-middle sm:px-5">
                          {entry ? (
                            <AnimatedVotes value={entry.votos} />
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </LayoutGroup>
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
