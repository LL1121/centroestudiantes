import Link from 'next/link'
import { Suspense } from 'react'
import { BookOpen, ChevronLeft, MessageCircle, Upload } from 'lucide-react'

import { getOptionalUser } from '@/lib/api/auth'
import { serverFetch } from '@/lib/api/server'
import type { MaterialRead, MaterialSearchRead, UserRead } from '@/lib/api/types'

import { DeleteMaterialButton } from './_components/delete-material-button'
import { matchKindLabel, MaterialTags } from './_components/material-tags'
import { MaterialsSearch } from './_components/materials-search'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Materiales · Biblioteca Digital',
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

export default async function MaterialesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const path = buildMaterialsPath(sp)
  const hasSearch = Boolean(sp.q?.trim() || sp.carrera?.trim() || sp.tag?.trim() || sp.tema?.trim())

  const [materials, user, suggestedTags] = await Promise.all([
    loadMaterials(path),
    getOptionalUser(),
    loadSuggestedTags(),
  ])
  const isGuest = user === null

  return (
    <div className="mx-auto max-w-5xl px-3 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/biblioteca"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Volver
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Biblioteca Digital</p>
          <h1 className="font-serif text-2xl font-bold text-navy sm:text-3xl">Materiales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buscá por nombre, materia, tema o similitud con el contenido indexado.
          </p>
        </div>
        <Link
          href={isGuest ? '/biblioteca/login?redirect=/biblioteca/subir' : '/biblioteca/subir'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto sm:py-2.5"
        >
          <Upload className="h-4 w-4" aria-hidden />
          {isGuest ? 'Ingresar para subir' : 'Subir material'}
        </Link>
      </div>

      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-muted/40" />}>
        <MaterialsSearch suggestedTags={suggestedTags} />
      </Suspense>

      {materials.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {hasSearch
              ? 'No encontramos materiales con esos criterios.'
              : 'Todavía no hay materiales en la biblioteca.'}
          </p>
          {!isGuest && !hasSearch && (
            <Link
              href="/biblioteca/subir"
              className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              Sé el primero en subir uno
            </Link>
          )}
        </div>
      ) : (
        <>
          {hasSearch && (
            <p className="mt-4 text-xs text-muted-foreground">
              {materials.length} resultado{materials.length === 1 ? '' : 's'}
            </p>
          )}
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
  const asistenteHref = `/biblioteca/asistente?material_id=${encodeURIComponent(material.id)}&titulo=${encodeURIComponent(material.titulo)}`
  const matchLabel = matchKindLabel(material.match_kind)

  return (
    <li className="relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold text-navy leading-snug">{material.titulo}</h2>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            <StatusBadge status={material.status} />
            {showDelete && (
              <DeleteMaterialButton materialId={material.id} titulo={material.titulo} />
            )}
          </div>
          {matchLabel && (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gold">
              {matchLabel}
            </span>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {material.carrera} · {material.tipo_archivo.toUpperCase()} · {formatBytes(material.size_bytes)}
      </p>
      <MaterialTags tags={material.tags ?? []} />
      {material.descripcion && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{material.descripcion}</p>
      )}
      <p className="mt-3 text-[10px] text-muted-foreground">
        Subido {formatDate(material.created_at)}
      </p>
      {ready ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <Link
            href={`/biblioteca/materiales/${material.id}/leer`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto sm:rounded-full sm:px-3 sm:py-1.5 sm:text-xs"
          >
            <BookOpen className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden />
            Leer en línea
          </Link>
          {isGuest ? (
            <span className="text-center text-xs text-muted-foreground sm:text-left">
              Ingresá para usar el asistente IA
            </span>
          ) : (
            <Link
              href={asistenteHref}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 sm:w-auto sm:border-0 sm:px-0 sm:py-0 sm:text-xs sm:hover:bg-transparent sm:hover:underline"
            >
              <MessageCircle className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden />
              Consultar con el asistente
            </Link>
          )}
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">{statusHint(material.status)}</p>
      )}
    </li>
  )
}

function StatusBadge({ status }: { status: MaterialSearchRead['status'] }) {
  const styles: Record<MaterialSearchRead['status'], string> = {
    pending: 'bg-gold/15 text-gold',
    processing: 'bg-primary/10 text-primary',
    active: 'bg-emerald-500/15 text-emerald-700',
    indexed: 'bg-emerald-500/15 text-emerald-700',
    failed: 'bg-destructive/10 text-destructive',
  }
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[status]}`}
    >
      {statusLabel(status)}
    </span>
  )
}

function statusLabel(status: MaterialSearchRead['status']): string {
  const labels: Record<MaterialSearchRead['status'], string> = {
    pending: 'Pendiente',
    processing: 'Procesando',
    active: 'Listo',
    indexed: 'Listo',
    failed: 'Error',
  }
  return labels[status]
}

function statusHint(status: MaterialSearchRead['status']): string {
  const hints: Record<MaterialSearchRead['status'], string> = {
    pending: 'En cola para indexado. Volvé en unos minutos.',
    processing: 'Indexando para el asistente…',
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
