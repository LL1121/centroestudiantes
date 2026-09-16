'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

import { Leaderboard } from '@/components/leaderboard'
import { VoteForm } from '@/components/vote-form'
import type { LeaderboardEntry, Profesor } from '@/lib/types'
import { VOTO_EMITIDO_KEY } from '@/lib/types'

interface Props {
  professors: Profesor[]
  professorsError?: boolean
  initialLeaderboard: LeaderboardEntry[]
}

export function VotingShell({
  professors,
  professorsError = false,
  initialLeaderboard,
}: Props) {
  const [ready, setReady] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)

  useEffect(() => {
    setHasVoted(window.localStorage.getItem(VOTO_EMITIDO_KEY) === 'true')
    setReady(true)
  }, [])

  const onVoted = () => {
    window.localStorage.setItem(VOTO_EMITIDO_KEY, 'true')
    setHasVoted(true)
  }

  if (!ready) {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-2xl bg-muted/70" />
        <div className="h-80 animate-pulse rounded-2xl bg-muted/50" />
      </div>
    )
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
      <div className="space-y-4">
        {hasVoted ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-semibold text-navy">¡Gracias por votar!</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Tu voto ya quedó registrado. El ranking de la derecha se actualiza en vivo.
                </p>
              </div>
            </div>
          </div>
        ) : professorsError ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive shadow-sm">
            No se pudo cargar la lista de profesores. Probá de nuevo en unos minutos.
          </p>
        ) : (
          <VoteForm professors={professors} onVoted={onVoted} />
        )}
      </div>

      <Leaderboard initialEntries={initialLeaderboard} />
    </div>
  )
}
