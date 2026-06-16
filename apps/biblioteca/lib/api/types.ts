export type UserRole = 'alumno' | 'moderador' | 'admin'

export interface UserRead {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  email_verified: boolean
  twofa_enabled: boolean
  created_at: string
  last_login_at: string | null
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LoginResponse {
  access_token: string | null
  refresh_token: string | null
  token_type: string
  requires_2fa: boolean
  challenge_token: string | null
}

export interface ApiError {
  detail: string
}

export type MaterialStatus =
  | 'pending'
  | 'processing'
  | 'active'
  | 'indexed'
  | 'quarantined'
  | 'failed'

export type TipoArchivo = 'pdf' | 'epub' | 'jpeg' | 'png'

export type ContentKind =
  | 'apunte_propio'
  | 'material_docente'
  | 'dominio_publico'
  | 'licencia_abierta'

export type CopyrightReportReason =
  | 'sin_autorizacion'
  | 'obra_comercial'
  | 'datos_personales'
  | 'otro'

export type CopyrightReportStatus = 'pending' | 'dismissed' | 'upheld'

export interface MaterialRead {
  id: string
  titulo: string
  descripcion: string | null
  autor: string | null
  anio_publicacion: number | null
  editorial: string | null
  isbn: string | null
  ciudad_publicacion: string | null
  carrera: string | null
  tags: string[]
  tipo_archivo: TipoArchivo
  mime_type: string
  size_bytes: number
  sha256: string
  status: MaterialStatus
  storage_key: string
  uploader_id: string | null
  content_kind: ContentKind | null
  rights_declared_at: string | null
  rights_declared_by_id: string | null
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

export interface CopyrightReportRead {
  id: string
  material_id: string
  reporter_email: string
  reporter_name: string | null
  reason: CopyrightReportReason
  details: string
  status: CopyrightReportStatus
  reviewed_by_id: string | null
  created_at: string
  material: MaterialRead | null
}
