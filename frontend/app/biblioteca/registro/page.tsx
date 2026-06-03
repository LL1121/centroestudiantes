import Image from 'next/image'
import Link from 'next/link'

import { SITE_LOGO } from '@/lib/branding'
import { bibHref } from '@/lib/biblioteca-path'

import { RegisterForm } from './register-form'

export const metadata = {
  title: 'Crear cuenta · Biblioteca Digital',
}

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src={SITE_LOGO}
            alt="Unidos por el IES"
            width={56}
            height={56}
            className="h-12 w-12 rounded-full"
            priority
          />
          <h1 className="mt-3 font-serif text-xl font-bold text-navy sm:text-2xl">
            Crear cuenta
          </h1>
          <p className="text-xs text-muted-foreground">
            Tu cuenta queda con rol <span className="font-medium">alumno</span>.
          </p>
        </div>

        <RegisterForm searchParamsPromise={searchParams} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿Ya tenés cuenta?{' '}
          <Link href={bibHref('/biblioteca/login')} className="font-medium text-primary hover:underline">
            Iniciá sesión
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          <Link href={bibHref('/biblioteca')} className="underline hover:text-primary">
            Volver al catálogo
          </Link>
        </p>
      </div>
    </div>
  )
}
