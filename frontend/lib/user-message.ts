/** Mensajes seguros para mostrar al usuario (sin filtrar errores técnicos). */

const TECHNICAL =
  /traceback|httpx|httpstatus|exception|for url '|client error '\d|server error '\d|\.py:\d|sqlalchemy|asyncpg|runtimeerror/i

const STATUS_FALLBACK: Record<number, string> = {
  401: 'Tenés que iniciar sesión para continuar.',
  403: 'No tenés permiso para realizar esta acción.',
  404: 'No encontramos lo que buscabas.',
  429: 'Demasiadas solicitudes. Esperá un momento e intentá de nuevo.',
  502: 'No pudimos completar la acción. Intentá de nuevo en un momento.',
  503: 'El servicio no está disponible ahora. Intentá más tarde.',
}

export function userMessage(
  detail: unknown,
  fallback = 'No pudimos completar la acción. Intentá de nuevo.',
  status?: number,
): string {
  if (typeof detail === 'string') {
    const text = detail.trim()
    if (text && text.length <= 280 && !TECHNICAL.test(text)) {
      return text
    }
  }
  if (status !== undefined && STATUS_FALLBACK[status]) {
    return STATUS_FALLBACK[status]!
  }
  return fallback
}

export function parseApiErrorBody(
  body: unknown,
  fallback: string,
  status?: number,
): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    return userMessage((body as { detail?: unknown }).detail, fallback, status)
  }
  return userMessage(undefined, fallback, status)
}
