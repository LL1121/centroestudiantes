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

export type MaterialStatus =
  | 'pending'
  | 'processing'
  | 'active'
  | 'indexed'
  | 'failed'

export type TipoArchivo = 'pdf' | 'epub' | 'jpeg' | 'png'

export interface MaterialRead {
  id: string
  titulo: string
  descripcion: string | null
  autor: string | null
  anio_publicacion: number | null
  editorial: string | null
  isbn: string | null
  ciudad_publicacion: string | null
  carrera: string
  tags: string[]
  tipo_archivo: TipoArchivo
  mime_type: string
  size_bytes: number
  sha256: string
  status: MaterialStatus
  storage_key: string
  uploader_id: string | null
  created_at: string
}

export interface MaterialSearchRead extends MaterialRead {
  relevance: number | null
  match_kind: string | null
}

export type MaterialMatchKind =
  | 'title'
  | 'description'
  | 'tag'
  | 'carrera'
  | 'semantic'
  | 'fuzzy'
  | 'similar'
  | 'recent'

export interface MaterialCitationRead {
  citation_apa: string
  source: 'manual' | 'llm' | 'mixed' | 'fake' | string
  missing_fields: string[]
}
