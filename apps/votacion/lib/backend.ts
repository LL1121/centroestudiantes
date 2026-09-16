import 'server-only'

export const BACKEND_URL =
  process.env.BACKEND_URL?.replace(/\/$/, '') ?? 'http://localhost:8000'

export async function backendFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; detail: string }> {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ detail: response.statusText }))) as {
      detail?: string
    }
    return {
      ok: false,
      status: response.status,
      detail: error.detail ?? 'Error desconocido',
    }
  }

  if (response.status === 204) {
    return { ok: true, data: undefined as T }
  }

  return { ok: true, data: (await response.json()) as T }
}
