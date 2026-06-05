/** Etiqueta legible para carrera/materia cuando el material es lectura general. */
export function materialCarreraLabel(carrera: string | null | undefined): string {
  const trimmed = carrera?.trim()
  return trimmed ? trimmed : 'Lectura general'
}
