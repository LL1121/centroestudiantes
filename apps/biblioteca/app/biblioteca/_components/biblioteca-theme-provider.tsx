'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { cn } from '@/lib/utils'

export const BIBLIOTECA_THEME_KEY = 'centro-biblioteca-theme'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 año

export type BibliotecaTheme = 'light' | 'dark'

interface BibliotecaThemeContextValue {
  theme: BibliotecaTheme
  setTheme: (theme: BibliotecaTheme) => void
  toggleTheme: () => void
  mounted: boolean
}

const BibliotecaThemeContext = createContext<BibliotecaThemeContextValue | null>(null)

/** Sincroniza cookie + localStorage para SSR y persistencia client. */
function persistTheme(theme: BibliotecaTheme): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(BIBLIOTECA_THEME_KEY, theme)
  } catch {
    /* storage bloqueado */
  }
  document.cookie = `${BIBLIOTECA_THEME_KEY}=${theme}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
}

/**
 * Boot script: corre antes de hidratar y aplica la clase .dark al wrapper si
 * el storage local difiere de la cookie (caso edge de primer visit, otra
 * pestaña, etc.). El SSR ya sembró la clase correcta vía cookie, así que esto
 * solo cubre desincronizaciones puntuales y no causa flash.
 */
const THEME_BOOT_SCRIPT = `!function(){try{var e=document.currentScript&&document.currentScript.parentElement;if(!e)return;var s=null;try{s=localStorage.getItem("${BIBLIOTECA_THEME_KEY}")}catch(_){}if(!s){var m=document.cookie.match(/(^|;\\s*)${BIBLIOTECA_THEME_KEY}=([^;]+)/);s=m?m[2]:null}if(s==="dark"){e.classList.add("dark")}else if(s==="light"){e.classList.remove("dark")}}catch(t){}}();`

interface ProviderProps {
  children: ReactNode
  initialTheme?: BibliotecaTheme
}

export function BibliotecaThemeProvider({ children, initialTheme = 'light' }: ProviderProps) {
  const [theme, setThemeState] = useState<BibliotecaTheme>(initialTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    let stored: string | null = null
    try {
      stored = localStorage.getItem(BIBLIOTECA_THEME_KEY)
    } catch {
      stored = null
    }
    if (stored === 'dark' || stored === 'light') {
      if (stored !== theme) setThemeState(stored)
      persistTheme(stored)
    } else {
      persistTheme(theme)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setTheme = useCallback((next: BibliotecaTheme) => {
    setThemeState(next)
    persistTheme(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: BibliotecaTheme = prev === 'dark' ? 'light' : 'dark'
      persistTheme(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, mounted }),
    [theme, setTheme, toggleTheme, mounted],
  )

  return (
    <BibliotecaThemeContext.Provider value={value}>
      <div
        data-biblioteca-root
        suppressHydrationWarning
        className={cn(
          'min-h-dvh bg-background text-foreground transition-colors duration-200',
          theme === 'dark' && 'dark',
          'overflow-x-hidden',
        )}
      >
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {children}
      </div>
    </BibliotecaThemeContext.Provider>
  )
}

export function useBibliotecaTheme(): BibliotecaThemeContextValue {
  const ctx = useContext(BibliotecaThemeContext)
  if (!ctx) {
    throw new Error('useBibliotecaTheme debe usarse dentro de BibliotecaThemeProvider')
  }
  return ctx
}
