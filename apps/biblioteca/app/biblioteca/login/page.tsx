import Image from 'next/image'
import Link from 'next/link'

import { SITE_LOGO } from '@/lib/branding'
import { bibHref } from '@/lib/biblioteca-path'
import { LoginForm } from './login-form'

export const metadata = {
  title: 'Ingresar · Biblioteca Digital',
}

export default function LoginPage({
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
            Biblioteca Digital
          </h1>
          <p className="text-xs text-muted-foreground">Ingresá con tu cuenta del Centro</p>
        </div>

        <LoginForm searchParamsPromise={searchParams} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿Todavía no tenés cuenta?{' '}
          <Link href={bibHref('/biblioteca/registro')} className="font-medium text-primary hover:underline">
            Creá una
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
