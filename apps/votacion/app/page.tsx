import { SiteHeader } from '@/components/site-header'
import { VotingShell } from '@/components/voting-shell'
import { backendFetch } from '@/lib/backend'
import type { LeaderboardEntry, Profesor } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function VotacionPage() {
  const [professorsResult, leaderboardResult] = await Promise.all([
    backendFetch<Profesor[]>('/api/v1/voting/professors'),
    backendFetch<LeaderboardEntry[]>('/api/v1/voting/leaderboard'),
  ])

  const professors = professorsResult.ok ? professorsResult.data : []
  const leaderboard = leaderboardResult.ok ? leaderboardResult.data : []

  return (
    <div className="page-atmosphere flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 sm:py-7">
        <div className="mb-5 rounded-2xl border border-border/80 bg-white/80 px-4 py-4 shadow-sm backdrop-blur sm:px-5 sm:py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Votación abierta
          </p>
          <h1 className="mt-1 font-serif text-2xl font-bold text-navy sm:text-3xl">
            Mejor Profesor
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Elegí al docente que más te inspiró este ciclo. Un voto por estudiante (DNI).
            El ranking se actualiza en tiempo real mientras la gente vota.
          </p>
        </div>

        <VotingShell
          professors={professors}
          professorsError={!professorsResult.ok}
          initialLeaderboard={leaderboard}
        />
      </main>

      <footer className="border-t border-border/80 bg-white/70 py-4 text-center text-xs text-muted-foreground backdrop-blur">
        Centro de Estudiantes &quot;Unidos por el IES&quot; · IES N° 9018
      </footer>
    </div>
  )
}
