import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { getOptionalUser } from '@/lib/api/auth'
import { bibHref } from '@/lib/biblioteca-path'

import { ChatShell } from './chat-shell'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Asistente IA · Biblioteca Digital',
}

interface PageProps {
  searchParams: Promise<{ material_id?: string; titulo?: string }>
}

export default async function AsistentePage({ searchParams }: PageProps) {
  const user = await getOptionalUser()
  if (!user) {
    redirect(`${bibHref('/biblioteca/login')}?redirect=${bibHref('/biblioteca/asistente')}`)
  }
  const params = await searchParams
  const materialId = params.material_id?.trim() || null
  const materialTitulo = params.titulo?.trim() || null

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Link
        href={bibHref('/biblioteca')}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Volver al panel
      </Link>

      <header className="mt-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Biblioteca Digital</p>
        <h1 className="font-serif text-2xl font-bold text-navy sm:text-3xl">Asistente del IES</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Te respondo en base a los apuntes y anuncios cargados.
        </p>
      </header>

      <div className="mt-5 flex flex-1 flex-col">
        <ChatShell initialMaterialId={materialId} materialTitulo={materialTitulo} />
      </div>
    </div>
  )
}
