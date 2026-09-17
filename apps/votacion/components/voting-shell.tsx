'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
        <AnimatePresence mode="wait">
          {hasVoted ? (
            <motion.div
              key="thanks"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.08 }}
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                </motion.div>
                <div>
                  <p className="font-semibold text-navy">¡Gracias por votar!</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Tu voto ya quedó registrado. El ranking de la derecha se actualiza en vivo.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : professorsError ? (
            <motion.p
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive shadow-sm"
            >
              No se pudo cargar la lista de profesores. Probá de nuevo en unos minutos.
            </motion.p>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.22 }}
            >
              <VoteForm professors={professors} onVoted={onVoted} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Leaderboard initialEntries={initialLeaderboard} />
    </div>
  )
}
