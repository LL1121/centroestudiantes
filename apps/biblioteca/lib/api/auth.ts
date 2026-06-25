import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'

import { COOKIE_ACCESS, COOKIE_REFRESH } from './config'
import { ApiRequestError, serverFetch } from './server'
import type { UserRead } from './types'

/**
 * Devuelve el usuario actual o `null` si es guest.
 * No redirige; el caller decide qué hacer.
 *
 * - Dedupe por request (layout + page comparten la misma llamada).
 * - Sin cookies de sesión no golpea `/users/me` (evita 401 en logs para visitantes).
 */
export const getOptionalUser = cache(async (): Promise<UserRead | null> => {
  const jar = await cookies()
  if (!jar.get(COOKIE_ACCESS)?.value && !jar.get(COOKIE_REFRESH)?.value) {
    return null
  }

  try {
    return await serverFetch<UserRead>('/api/v1/users/me')
  } catch (error) {
    if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
      return null
    }
    throw error
  }
})
