import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, MessageCircle, Upload } from 'lucide-react'

import { ApiRequestError, serverFetch } from '@/lib/api/server'
import type { UserRead } from '@/lib/api/types'
import { LogoutButton } from './_components/logout-button'

export const dynamic = 'force-dynamic'

async function loadUser(): Promise<UserRead> {
  try {
    return await serverFetch<UserRead>('/api/v1/users/me')
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      redirect('/biblioteca/login')
    }
    throw error
  }
}

export default async function BibliotecaHome() {
  const user = await loadUser()

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Biblioteca Digital</p>
          <h1 className="font-serif text-2xl font-bold text-navy sm:text-3xl">
            Hola, {user.full_name.split(' ')[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            Acceso autenticado · Rol: <span className="font-medium text-primary">{user.role}</span>
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ModuleCard
          icon={<BookOpen className="h-5 w-5" />}
          title="Materiales"
          description="Apuntes, libros y guías compartidas."
          href="#"
          disabled
          tag="Etapa 2"
        />
        <ModuleCard
          icon={<Upload className="h-5 w-5" />}
          title="Subir material"
          description="Carga validada (PDF, EPUB, JPEG, PNG)."
          href="/biblioteca/subir"
        />
        <ModuleCard
          icon={<MessageCircle className="h-5 w-5" />}
          title="Asistente IA"
          description="RAG sobre el material indexado."
          href="#"
          disabled
          tag="Etapa 4"
        />
      </div>

      <p className="mt-10 text-xs text-muted-foreground">
        <Link href="/" className="underline hover:text-primary">
          Volver al sitio
        </Link>
      </p>
    </div>
  )
}

interface ModuleCardProps {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  disabled?: boolean
  tag?: string
}

function ModuleCard({ icon, title, description, href, disabled, tag }: ModuleCardProps) {
  const className =
    'group relative flex h-full flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-200'
  const content = (
    <>
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="font-semibold text-navy">{title}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {tag && (
        <span className="mt-4 inline-flex w-fit items-center rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">
          {tag}
        </span>
      )}
    </>
  )

  if (disabled) {
    return (
      <div className={`${className} cursor-not-allowed opacity-70`} aria-disabled>
        {content}
      </div>
    )
  }

  return (
    <Link href={href} className={`${className} hover:-translate-y-0.5 hover:border-primary/40 hover:shadow`}>
      {content}
    </Link>
  )
}
