export const ACCEPT = '.pdf,.epub,.jpg,.jpeg,.png'

export const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/epub+zip',
  'image/jpeg',
  'image/png',
])

export const MAX_BYTES = 50 * 1024 * 1024

export interface UploadResponse {
  material: {
    id: string
    titulo: string
    carrera: string
    tipo_archivo: string
    size_bytes: number
  }
  deduplicated: boolean
}

export interface ApiErrorBody {
  detail?: string
}

/** Valida un archivo contra tamaño y MIME. Devuelve mensaje de error o null. */
export function validateFile(file: File): string | null {
  if (file.size > MAX_BYTES) {
    return `"${file.name}" supera el límite de 50 MB.`
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return `"${file.name}" tiene un formato no soportado.`
  }
  return null
}

/** Título por defecto a partir del nombre de archivo (sin extensión). */
export function titleFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^./\\]+$/, '')
  return withoutExt.replace(/[_]+/g, ' ').trim() || filename
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
