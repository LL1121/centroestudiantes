import Link from 'next/link'
import { BookOpen } from 'lucide-react'

import type { MaterialSearchRead } from '@/lib/api/types'

import { MaterialTags } from './material-tags'
import { MaterialThumbnail } from './material-thumbnail'

interface Props {
  items: MaterialSearchRead[]
}

export function SimilarMaterials({ items }: Props) {
  if (items.length === 0) return null

  return (
    <section className="mt-8 border-t border-border pt-6">
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg font-bold text-navy sm:text-xl">Materiales similares</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Recomendados por contenido, materia y temas relacionados.
          </p>
        </div>
      </div>

      <ul className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
        {items.map((material) => (
          <SimilarCard key={material.id} material={material} />
        ))}
      </ul>
    </section>
  )
}

function SimilarCard({ material }: { material: MaterialSearchRead }) {
  const ready = material.status === 'active' || material.status === 'indexed'

  return (
    <li className="w-[72vw] shrink-0 snap-start sm:w-auto">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
        <div className="p-2 pb-0">
          <MaterialThumbnail
            materialId={material.id}
            tipo={material.tipo_archivo}
            titulo={material.titulo}
            ready={ready}
          />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <h3 className="line-clamp-2 font-serif text-sm font-bold leading-snug text-navy">
            {material.titulo}
          </h3>
          <p className="text-[11px] text-muted-foreground">{material.carrera}</p>
          <MaterialTags tags={material.tags ?? []} className="mt-0" />
          {ready ? (
            <Link
              href={`/biblioteca/materiales/${material.id}/leer`}
              className="mt-auto inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              Leer
            </Link>
          ) : (
            <p className="mt-auto text-[11px] text-muted-foreground">Procesando…</p>
          )}
        </div>
      </article>
    </li>
  )
}
