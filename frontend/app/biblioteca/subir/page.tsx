import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { getOptionalUser } from '@/lib/api/auth'

import { UploadForm } from './upload-form'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Subir material · Biblioteca Digital',
}

export default async function SubirPage() {
  const user = await getOptionalUser()
  if (!user) {
    redirect('/biblioteca/login?redirect=/biblioteca/subir')
  }
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/biblioteca"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Volver
      </Link>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Biblioteca Digital</p>
        <h1 className="font-serif text-2xl font-bold text-navy sm:text-3xl">Subir material</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Apuntes, libros y guías. Formatos aceptados: PDF, EPUB, JPEG y PNG.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
        <UploadForm />
      </div>
    </div>
  )
}
