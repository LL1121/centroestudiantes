'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'

import { SITE_LOGO } from '@/lib/branding'

export function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'border-b border-border/60 bg-white/85 backdrop-blur-md shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 sm:gap-3" aria-label="Inicio">
          <Image
            src={SITE_LOGO}
            alt="Unidos por el IES"
            width={36}
            height={36}
            className="h-8 w-8 rounded-full sm:h-9 sm:w-9"
            priority
          />
          <span className="hidden text-sm font-semibold text-navy sm:block">
            Unidos por el IES
          </span>
        </Link>

        <Link
          href="/biblioteca"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-primary/90 hover:shadow sm:px-4 sm:text-sm"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          Biblioteca Digital
        </Link>
      </div>
    </header>
  )
}
