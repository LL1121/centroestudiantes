'use client'

import { Moon, Sun, SunDim } from 'lucide-react'

import type { ReadingTheme } from '@/lib/reading-theme'
import { cn } from '@/lib/utils'

interface Props {
  value: ReadingTheme
  onChange: (next: ReadingTheme) => void
  className?: string
}

const OPTIONS: { id: ReadingTheme; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'sepia', label: 'Sepia', icon: SunDim },
  { id: 'dark', label: 'Oscuro', icon: Moon },
]

export function ReadingThemeToggle({ value, onChange, className }: Props) {
  return (
    <div
      role="group"
      aria-label="Modo de lectura"
      className={cn(
        'inline-flex rounded-lg border border-border bg-background p-0.5',
        className,
      )}
    >
      {OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          title={label}
          className={cn(
            'inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors',
            value === id
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-navy',
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
