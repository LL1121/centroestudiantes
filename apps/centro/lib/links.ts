/**
 * URL pública de la Biblioteca Digital.
 * En desarrollo local apunta a /biblioteca (mismo origen).
 * En producción setear NEXT_PUBLIC_BIBLIOTECA_URL según la topología de dominio:
 *   - Mismo dominio con path:  NEXT_PUBLIC_BIBLIOTECA_URL=/biblioteca
 *   - Subdominios separados:   NEXT_PUBLIC_BIBLIOTECA_URL=https://biblioteca.lyntrix.com.ar
 */
export const BIBLIOTECA_URL =
  process.env.NEXT_PUBLIC_BIBLIOTECA_URL ?? '/biblioteca'
