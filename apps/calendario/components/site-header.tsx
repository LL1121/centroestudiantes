import Image from 'next/image'
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { SITE_LOGO, SITE_NAME } from '@/lib/branding'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Inicio">
          <Image
            src={SITE_LOGO}
            alt={SITE_NAME}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full"
            priority
          />
          <span className="hidden text-sm font-semibold text-navy sm:block">
            {SITE_NAME}
          </span>
        </Link>

        <div className="mx-3 hidden h-5 w-px bg-border sm:block" aria-hidden />

        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Calendar className="h-4 w-4 text-primary" aria-hidden />
          <span>Calendario</span>
        </div>
      </div>
    </header>
  )
}
