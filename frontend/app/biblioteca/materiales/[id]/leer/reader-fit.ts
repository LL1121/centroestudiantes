/** Cálculo de ancho base para ajustar una página al contenedor (fit-to-screen). */

export interface ContainerSize {
  width: number
  height: number
}

const CONTENT_PADDING = 24

/** Ancho que hace que la página quepa entera (ancho y alto) en el contenedor. */
export function computeFitBaseWidth(
  container: ContainerSize | null,
  pageAspect: number | null,
): number | null {
  if (!container || !pageAspect || pageAspect <= 0) return null
  const availW = Math.max(0, container.width - CONTENT_PADDING)
  const availH = Math.max(0, container.height - CONTENT_PADDING)
  return Math.min(availW, availH * pageAspect)
}
