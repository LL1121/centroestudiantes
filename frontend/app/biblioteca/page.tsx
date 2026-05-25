import Link from 'next/link'
import { BookOpen, MessageCircle, Upload } from 'lucide-react'

import { getOptionalUser } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export default async function BibliotecaHome() {
  const user = await getOptionalUser()

  return (
    <div className="mx-auto max-w-5xl px-3 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Biblioteca Digital</p>
        <h1 className="font-serif text-2xl font-bold text-navy sm:text-3xl">
          {user ? `Hola, ${user.full_name.split(' ')[0]}` : 'Biblioteca abierta'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {user ? (
            <>
              Acceso autenticado · Rol:{' '}
              <span className="font-medium text-primary">{user.role}</span>
            </>
          ) : (
            'Explorá el catálogo y leé apuntes sin necesidad de iniciar sesión. Para subir o usar el asistente IA, creá una cuenta.'
          )}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ModuleCard
          icon={<BookOpen className="h-5 w-5" />}
          title="Materiales"
          description="Apuntes, libros y guías compartidas. Lectura libre."
          href="/biblioteca/materiales"
        />
        <ModuleCard
          icon={<Upload className="h-5 w-5" />}
          title="Subir material"
          description="Carga validada (PDF, EPUB, JPEG, PNG)."
          href={user ? '/biblioteca/subir' : '/biblioteca/login?redirect=/biblioteca/subir'}
          requiresAuth={!user}
        />
        <ModuleCard
          icon={<MessageCircle className="h-5 w-5" />}
          title="Asistente IA"
          description="RAG sobre el material indexado."
          href={user ? '/biblioteca/asistente' : '/biblioteca/login?redirect=/biblioteca/asistente'}
          requiresAuth={!user}
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
  requiresAuth?: boolean
}

function ModuleCard({ icon, title, description, href, requiresAuth }: ModuleCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow"
    >
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="font-semibold text-navy">{title}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {requiresAuth && (
        <span className="mt-4 inline-flex w-fit items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Requiere ingresar
        </span>
      )}
    </Link>
  )
}
