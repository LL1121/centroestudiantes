import 'server-only'

import { ApiRequestError, serverFetch } from './server'
import type { UserRead } from './types'

/**
 * Devuelve el usuario actual o `null` si es guest.
 * No redirige; el caller decide qué hacer.
 */
export async function getOptionalUser(): Promise<UserRead | null> {
  try {
    return await serverFetch<UserRead>('/api/v1/users/me')
  } catch (error) {
    if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
      return null
    }
    throw error
  }
}
