'use client'

import { Moon, Sun } from 'lucide-react'

import { cn } from '@/lib/utils'

import { useBibliotecaTheme } from './biblioteca-theme-provider'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, mounted } = useBibliotecaTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={!mounted}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-navy transition-colors hover:border-primary/40 hover:bg-secondary/60 disabled:opacity-50',
        className,
      )}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-gold" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  )
}
