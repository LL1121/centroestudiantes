import 'server-only'

import { parseApiErrorBody } from '@/lib/user-message'

/** Normaliza errores del backend antes de devolverlos al navegador. */
export async function proxyErrorResponse(
  upstream: Response,
  fallback: string,
): Promise<Response> {
  const text = await upstream.text()
  let detail = fallback
  try {
    const json = JSON.parse(text) as unknown
    detail = parseApiErrorBody(json, fallback, upstream.status)
  } catch {
    detail = parseApiErrorBody(undefined, fallback, upstream.status)
  }
  const status = upstream.status >= 500 ? 502 : upstream.status
  return Response.json({ detail }, { status })
}
