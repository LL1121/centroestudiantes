export const BACKEND_URL =
  process.env.BACKEND_URL?.replace(/\/$/, '') ?? 'http://localhost:8000'

export const COOKIE_ACCESS = 'centro_access'
export const COOKIE_REFRESH = 'centro_refresh'

export const ACCESS_MAX_AGE = 60 * 30
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 14
