import Image from 'next/image'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { SITE_LOGO, SITE_NAME } from '@/lib/branding'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Inicio">
          <Image
            src={SITE_LOGO}
            alt={SITE_NAME}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full"
            priority
          />
          <span className="text-sm font-semibold text-navy">{SITE_NAME}</span>
        </Link>

        <div className="flex items-center gap-1.5 rounded-full bg-navy/5 px-3 py-1 text-sm font-medium text-navy">
          <Trophy className="h-4 w-4 text-accent" aria-hidden />
          <span>Mejor Profesor</span>
        </div>
      </div>
    </header>
  )
}
