/** Tipos de contenido permitidos y textos legales de la biblioteca institucional. */

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

export const CONTENT_KIND_OPTIONS: { value: ContentKind; label: string; hint: string }[] = [
  {
    value: 'apunte_propio',
    label: 'Apunte o trabajo propio',
    hint: 'Material creado por vos o con autoría conocida y consentida.',
  },
  {
    value: 'material_docente',
    label: 'Material docente autorizado',
    hint: 'Slides, guías o recursos compartidos por docentes para la cursada.',
  },
  {
    value: 'dominio_publico',
    label: 'Dominio público',
    hint: 'Obras cuyos derechos de autor ya expiraron o fueron renunciados.',
  },
  {
    value: 'licencia_abierta',
    label: 'Licencia abierta (CC, etc.)',
    hint: 'Material con licencia que permite redistribución (Creative Commons u otra).',
  },
]

export const COPYRIGHT_REPORT_REASONS: { value: CopyrightReportReason; label: string }[] = [
  { value: 'sin_autorizacion', label: 'Publicado sin mi autorización' },
  { value: 'obra_comercial', label: 'Obra comercial protegida (libro, manual, etc.)' },
  { value: 'datos_personales', label: 'Contiene datos personales sin consentimiento' },
  { value: 'otro', label: 'Otro motivo relacionado con derechos' },
]

/** Email de contacto para reclamos (configurable vía env en despliegue). */
export const COPYRIGHT_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_COPYRIGHT_CONTACT_EMAIL ?? 'biblioteca@ies9018malargue.edu.ar'

export const RIGHTS_DECLARATION_TEXT =
  'Declaro que tengo derecho a compartir este material en la biblioteca institucional ' +
  'o que su publicación está permitida (material docente autorizado, dominio público ' +
  'o licencia abierta). Entiendo que el Centro de Estudiantes puede retirarlo ante un ' +
  'reclamo fundado de derechos de autor.'

export function contentKindLabel(kind: ContentKind | null | undefined): string {
  if (!kind) return 'Sin clasificar'
  return CONTENT_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind
}

export function copyrightReasonLabel(reason: CopyrightReportReason): string {
  return COPYRIGHT_REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason
}
