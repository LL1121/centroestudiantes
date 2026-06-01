import Link from 'next/link'
import { BookOpen, Layers, Sparkles, Tag, Upload } from 'lucide-react'

import type { MaterialSearchRead, UserRead } from '@/lib/api/types'

interface Props {
  materials: MaterialSearchRead[]
  totalTags: number
  user: UserRead | null
}

export function BibliotecaHero({ materials, totalTags, user }: Props) {
  const total = materials.length
  const carrerasUnicas = new Set(materials.map((m) => m.carrera.trim().toLowerCase()).filter(Boolean)).size
  const recientes = materials.filter((m) => {
    const created = new Date(m.created_at).getTime()
    const dias = (Date.now() - created) / (1000 * 60 * 60 * 24)
    return dias <= 7
  }).length

  const isGuest = user === null
  const subirHref = isGuest ? '/biblioteca/login?redirect=/biblioteca/subir' : '/biblioteca/subir'

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-gold/10 px-5 py-7 shadow-sm sm:px-8 sm:py-9">
      {/* Decoración: blobs sutiles */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-gold/15 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-card/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur">
              <Sparkles className="h-3 w-3" aria-hidden />
              Biblioteca Digital
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-navy sm:text-4xl">
              {user
                ? `Hola, ${user.full_name.split(' ')[0]}.`
                : 'Apuntes, libros y guías.'}
              <br className="hidden sm:inline" />
              <span className="text-primary">Todo en un solo lugar.</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Buscá por nombre, materia o tema. Leelos en línea o usá el asistente IA para preguntarle sobre el contenido.
            </p>
          </div>

          <Link
            href={subirHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] hover:bg-primary/90 sm:self-end"
          >
            <Upload className="h-4 w-4" aria-hidden />
            {isGuest ? 'Ingresar para subir' : 'Subir material'}
          </Link>
        </div>

        <dl className="grid grid-cols-3 gap-2 sm:max-w-md sm:gap-3">
          <Stat icon={<BookOpen className="h-4 w-4" />} label="Materiales" value={total} tone="primary" />
          <Stat icon={<Layers className="h-4 w-4" />} label="Carreras" value={carrerasUnicas} tone="gold" />
          <Stat
            icon={<Tag className="h-4 w-4" />}
            label={recientes > 0 ? 'Nuevos (7d)' : 'Temas'}
            value={recientes > 0 ? recientes : totalTags}
            tone="emerald"
          />
        </dl>
      </div>
    </section>
  )
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: 'primary' | 'gold' | 'emerald'
}) {
  const toneClasses: Record<string, string> = {
    primary: 'text-primary bg-primary/10',
    gold: 'text-gold bg-gold/15',
    emerald: 'text-emerald-700 bg-emerald-500/15',
  }
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3 backdrop-blur">
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${toneClasses[tone]}`}>
          {icon}
        </span>
        <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      </div>
      <dd className="mt-1 font-serif text-2xl font-bold text-navy tabular-nums">{value}</dd>
    </div>
  )
}
