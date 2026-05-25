import Link from 'next/link'
import { ChevronLeft, MessageCircle, Upload } from 'lucide-react'

import { getOptionalUser } from '@/lib/api/auth'
import { serverFetch } from '@/lib/api/server'
import type { MaterialRead, MaterialStatus } from '@/lib/api/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Materiales · Biblioteca Digital',
}

async function loadMaterials(): Promise<MaterialRead[]> {
  return await serverFetch<MaterialRead[]>('/api/v1/materials?limit=100')
}

export default async function MaterialesPage() {
  const [materials, user] = await Promise.all([loadMaterials(), getOptionalUser()])
  const isGuest = user === null

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
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
            Apuntes, libros y guías compartidas por la comunidad.
          </p>
        </div>
        <Link
          href={isGuest ? '/biblioteca/login?redirect=/biblioteca/subir' : '/biblioteca/subir'}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Upload className="h-4 w-4" aria-hidden />
          {isGuest ? 'Ingresar para subir' : 'Subir material'}
        </Link>
      </div>

      {materials.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <p className="text-sm text-muted-foreground">Todavía no hay materiales en la biblioteca.</p>
          {!isGuest && (
            <Link
              href="/biblioteca/subir"
              className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              Sé el primero en subir uno
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {materials.map((material) => (
            <MaterialCard key={material.id} material={material} isGuest={isGuest} />
          ))}
        </ul>
      )}
    </div>
  )
}

function MaterialCard({ material, isGuest }: { material: MaterialRead; isGuest: boolean }) {
  const ready = material.status === 'active' || material.status === 'indexed'
  const asistenteHref = `/biblioteca/asistente?material_id=${encodeURIComponent(material.id)}&titulo=${encodeURIComponent(material.titulo)}`

  return (
    <li className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold text-navy leading-snug">{material.titulo}</h2>
        <StatusBadge status={material.status} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {material.carrera} · {material.tipo_archivo.toUpperCase()} · {formatBytes(material.size_bytes)}
      </p>
      {material.descripcion && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{material.descripcion}</p>
      )}
      <p className="mt-3 text-[10px] text-muted-foreground">
        Subido {formatDate(material.created_at)}
      </p>
      {ready ? (
        isGuest ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Iniciá sesión para consultarlo con el asistente IA.
          </p>
        ) : (
          <Link
            href={asistenteHref}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            Consultar con el asistente
          </Link>
        )
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          {statusHint(material.status)}
        </p>
      )}
    </li>
  )
}

function StatusBadge({ status }: { status: MaterialStatus }) {
  const styles: Record<MaterialStatus, string> = {
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

function statusLabel(status: MaterialStatus): string {
  const labels: Record<MaterialStatus, string> = {
    pending: 'Pendiente',
    processing: 'Procesando',
    active: 'Listo',
    indexed: 'Listo',
    failed: 'Error',
  }
  return labels[status]
}

function statusHint(status: MaterialStatus): string {
  const hints: Record<MaterialStatus, string> = {
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
