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

export type BibliotecaTheme = 'light' | 'dark'

interface BibliotecaThemeContextValue {
  theme: BibliotecaTheme
  setTheme: (theme: BibliotecaTheme) => void
  toggleTheme: () => void
  mounted: boolean
}

const BibliotecaThemeContext = createContext<BibliotecaThemeContextValue | null>(null)

/** Evita flash de tema claro antes de leer localStorage. */
const THEME_BOOT_SCRIPT = `!function(){try{var e=document.currentScript&&document.currentScript.parentElement;if(!e)return;"dark"===localStorage.getItem("${BIBLIOTECA_THEME_KEY}")&&e.classList.add("dark")}catch(t){}}();`

function readStoredTheme(): BibliotecaTheme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(BIBLIOTECA_THEME_KEY)
  return stored === 'dark' ? 'dark' : 'light'
}

export function BibliotecaThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<BibliotecaTheme>(readStoredTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const setTheme = useCallback((next: BibliotecaTheme) => {
    setThemeState(next)
    localStorage.setItem(BIBLIOTECA_THEME_KEY, next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: BibliotecaTheme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem(BIBLIOTECA_THEME_KEY, next)
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
        className={cn(
          'min-h-dvh bg-secondary/30 text-foreground transition-colors duration-200',
          theme === 'dark' && 'dark',
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
