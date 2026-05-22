import 'server-only'

import { cookies } from 'next/headers'

import { BACKEND_URL, COOKIE_ACCESS } from './config'
import type { ApiError } from './types'

interface ServerFetchOptions extends RequestInit {
  authenticated?: boolean
}

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(detail)
  }
}

export async function serverFetch<T>(path: string, init: ServerFetchOptions = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.authenticated ?? true) {
    const jar = await cookies()
    const token = jar.get(COOKIE_ACCESS)?.value
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ detail: response.statusText }))) as ApiError
    throw new ApiRequestError(response.status, error.detail ?? 'Error desconocido')
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
