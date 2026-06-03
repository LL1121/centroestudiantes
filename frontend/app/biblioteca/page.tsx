import Link from 'next/link'
import { Suspense } from 'react'
import { BookOpen, MessageCircle, Sparkles } from 'lucide-react'

import { getOptionalUser } from '@/lib/api/auth'
import { serverFetch } from '@/lib/api/server'
import type { MaterialRead, MaterialSearchRead, UserRead } from '@/lib/api/types'
import { bibHref } from '@/lib/biblioteca-path'

import { BibliotecaHero } from './_components/biblioteca-hero'
import { DeleteMaterialButton } from './_components/delete-material-button'
import { MaterialsAutoRefresh } from './_components/materials-auto-refresh'
import { matchKindLabel, MaterialTags } from './_components/material-tags'
import { MaterialThumbnail } from './_components/material-thumbnail'
import { MaterialsSearch } from './_components/materials-search'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Biblioteca Digital',
}

interface PageProps {
  searchParams: Promise<{
    q?: string
    carrera?: string
    tag?: string
    tema?: string
    semantic?: string
  }>
}

function buildMaterialsPath(params: {
  q?: string
  carrera?: string
  tag?: string
  tema?: string
  semantic?: string
}): string {
  const sp = new URLSearchParams()
  sp.set('limit', '100')
  if (params.q?.trim()) sp.set('q', params.q.trim())
  if (params.carrera?.trim()) sp.set('carrera', params.carrera.trim())
  const tag = (params.tag ?? params.tema)?.trim()
  if (tag) sp.set('tag', tag)
  if (params.semantic === '0') sp.set('semantic', 'false')
  return `/api/v1/materials?${sp.toString()}`
}

async function loadMaterials(path: string): Promise<MaterialSearchRead[]> {
  return await serverFetch<MaterialSearchRead[]>(path, { authenticated: false })
}

async function loadSuggestedTags(): Promise<string[]> {
  try {
    return await serverFetch<string[]>('/api/v1/materials/tags?limit=24', {
      authenticated: false,
    })
  } catch {
    return []
  }
}

function canDelete(user: UserRead | null, material: MaterialRead): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return material.uploader_id === user.id
}

export default async function BibliotecaHome({ searchParams }: PageProps) {
  const sp = await searchParams
  const path = buildMaterialsPath(sp)
  const hasSearch = Boolean(sp.q?.trim() || sp.carrera?.trim() || sp.tag?.trim() || sp.tema?.trim())

  const [materials, allMaterials, user, suggestedTags] = await Promise.all([
    loadMaterials(path),
    hasSearch ? loadMaterials('/api/v1/materials?limit=100&semantic=false') : Promise.resolve(null),
    getOptionalUser(),
    loadSuggestedTags(),
  ])
  const isGuest = user === null
  const heroSource = allMaterials ?? materials
  const hasProcessing = materials.some(
    (m) => m.status === 'pending' || m.status === 'processing',
  )

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <MaterialsAutoRefresh active={hasProcessing} />
      <BibliotecaHero materials={heroSource} totalTags={suggestedTags.length} user={user} />

      <div className="mt-6 sm:mt-8">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-muted/40" />}>
          <MaterialsSearch suggestedTags={suggestedTags} />
        </Suspense>
      </div>

      {materials.length === 0 ? (
        <EmptyState hasSearch={hasSearch} isGuest={isGuest} />
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-bold text-navy sm:text-xl">
              {hasSearch ? 'Resultados' : 'Catálogo'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {materials.length} {materials.length === 1 ? 'material' : 'materiales'}
            </p>
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {materials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                isGuest={isGuest}
                canDelete={canDelete(user, material)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function EmptyState({ hasSearch, isGuest }: { hasSearch: boolean; isGuest: boolean }) {
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-dashed border-border bg-gradient-to-br from-secondary/40 to-card p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <BookOpen className="h-7 w-7 text-primary" aria-hidden />
      </div>
      <p className="mt-4 text-base font-semibold text-navy">
        {hasSearch ? 'Sin resultados' : 'Todavía no hay materiales'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasSearch
          ? 'Probá con otras palabras o limpiá los filtros.'
          : 'Sé el primero en compartir un apunte con la comunidad.'}
      </p>
      {!isGuest && !hasSearch && (
        <Link
          href={bibHref('/biblioteca/subir')}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Subir el primer material
        </Link>
      )}
    </div>
  )
}

function MaterialCard({
  material,
  isGuest,
  canDelete: showDelete,
}: {
  material: MaterialSearchRead
  isGuest: boolean
  canDelete: boolean
}) {
  const ready = material.status === 'active' || material.status === 'indexed'
  const asistenteHref = `${bibHref('/biblioteca/asistente')}?material_id=${encodeURIComponent(material.id)}&titulo=${encodeURIComponent(material.titulo)}`
  const matchLabel = matchKindLabel(material.match_kind)

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <div className="relative p-3 pb-0">
        <MaterialThumbnail
          materialId={material.id}
          tipo={material.tipo_archivo}
          titulo={material.titulo}
          ready={ready}
        />
        <div className="absolute right-4 top-4 flex flex-col items-end gap-1">
          <StatusBadge status={material.status} />
          {matchLabel && (
            <span className="rounded-full bg-gold/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-900 shadow-sm">
              {matchLabel}
            </span>
          )}
        </div>
        {showDelete && (
          <div className="absolute left-4 top-4">
            <DeleteMaterialButton materialId={material.id} titulo={material.titulo} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="line-clamp-2 font-serif text-base font-bold leading-snug text-navy">
            {material.titulo}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {material.carrera} · {material.tipo_archivo.toUpperCase()} · {formatBytes(material.size_bytes)}
          </p>
        </div>

        {material.descripcion && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{material.descripcion}</p>
        )}

        <MaterialTags tags={material.tags ?? []} />

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {ready ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href={bibHref(`/biblioteca/materiales/${material.id}/leer`)}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <BookOpen className="h-4 w-4" aria-hidden />
                Leer
              </Link>
              {!isGuest && (
                <Link
                  href={asistenteHref}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/5"
                  aria-label="Consultar con el asistente"
                  title="Consultar con el asistente"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  <span className="sm:hidden">Asistente IA</span>
                  <Sparkles className="hidden h-3.5 w-3.5 text-gold sm:inline" aria-hidden />
                </Link>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{statusHint(material.status)}</p>
          )}
          <p className="text-[10px] text-muted-foreground">Subido {formatDate(material.created_at)}</p>
        </div>
      </div>
    </li>
  )
}

function StatusBadge({ status }: { status: MaterialSearchRead['status'] }) {
  const styles: Record<MaterialSearchRead['status'], string> = {
    pending: 'bg-primary/90 text-primary-foreground',
    processing: 'bg-primary/90 text-primary-foreground',
    active: 'bg-emerald-600/90 text-white',
    indexed: 'bg-emerald-600/90 text-white',
    failed: 'bg-destructive/90 text-white',
  }
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm backdrop-blur ${styles[status]}`}
    >
      {statusLabel(status)}
    </span>
  )
}

function statusLabel(status: MaterialSearchRead['status']): string {
  const labels: Record<MaterialSearchRead['status'], string> = {
    pending: 'Procesando',
    processing: 'Procesando',
    active: 'Listo',
    indexed: 'Listo',
    failed: 'Error',
  }
  return labels[status]
}

function statusHint(status: MaterialSearchRead['status']): string {
  const hints: Record<MaterialSearchRead['status'], string> = {
    pending: 'Procesando archivo…',
    processing: 'Procesando archivo…',
    active: '',
    indexed: '',
    failed: 'No se pudo procesar este archivo.',
  }
  return hints[status]
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
