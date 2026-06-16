export type ReadingTheme = 'light' | 'sepia' | 'dark'

export const READING_THEME_KEY = 'centro-reading-theme'

export function loadReadingTheme(): ReadingTheme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(READING_THEME_KEY)
  if (stored === 'sepia' || stored === 'dark') return stored
  return 'light'
}

export function saveReadingTheme(theme: ReadingTheme): void {
  localStorage.setItem(READING_THEME_KEY, theme)
}

export const READING_SURFACE: Record<ReadingTheme, string> = {
  light: 'bg-[#f5f5f0]',
  sepia: 'bg-[#f4ecd8]',
  dark: 'bg-[#1a1a1a]',
}
