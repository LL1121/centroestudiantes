export type UserRole = 'alumno' | 'moderador' | 'admin'

export interface UserRead {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface ApiError {
  detail: string
}
