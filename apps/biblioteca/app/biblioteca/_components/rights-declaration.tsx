'use client'

import Link from 'next/link'

import {
  CONTENT_KIND_OPTIONS,
  RIGHTS_DECLARATION_TEXT,
  type ContentKind,
} from '@/lib/copyright'
import { bibHref } from '@/lib/biblioteca-path'

interface Props {
  contentKind: ContentKind | ''
  onContentKindChange: (value: ContentKind) => void
  rightsAccepted: boolean
  onRightsAcceptedChange: (value: boolean) => void
  disabled?: boolean
}

/** Bloque reutilizable: tipo de contenido + declaración obligatoria de derechos. */
export function RightsDeclarationBlock({
  contentKind,
  onContentKindChange,
  rightsAccepted,
  onRightsAcceptedChange,
  disabled = false,
}: Props) {
  return (
    <div className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
          Declaración de derechos (obligatorio)
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Como biblioteca institucional, solo aceptamos material que pueda compartirse
          legalmente.{' '}
          <Link href={bibHref('/biblioteca/legal')} className="text-primary underline-offset-2 hover:underline">
            Ver política completa
          </Link>
        </p>
      </div>

      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="mb-1 block text-xs font-medium text-navy">
          Tipo de contenido <span className="text-destructive">*</span>
        </legend>
        {CONTENT_KIND_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
              contentKind === opt.value
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/30'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <input
              type="radio"
              name="content_kind"
              value={opt.value}
              checked={contentKind === opt.value}
              onChange={() => onContentKindChange(opt.value)}
              className="mt-0.5 accent-primary"
              required
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-navy">{opt.label}</span>
              <span className="block text-[11px] text-muted-foreground">{opt.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className={`flex cursor-pointer gap-3 ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
        <input
          type="checkbox"
          checked={rightsAccepted}
          onChange={(e) => onRightsAcceptedChange(e.target.checked)}
          disabled={disabled}
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span className="text-xs leading-relaxed text-navy">{RIGHTS_DECLARATION_TEXT}</span>
      </label>
    </div>
  )
}

export function validateRightsSubmission(
  contentKind: ContentKind | '',
  rightsAccepted: boolean,
): string | null {
  if (!contentKind) return 'Seleccioná el tipo de contenido.'
  if (!rightsAccepted) return 'Debés aceptar la declaración de derechos.'
  return null
}

export function appendRightsToFormData(
  data: FormData,
  contentKind: ContentKind,
): void {
  data.append('content_kind', contentKind)
  data.append('rights_declaration', 'true')
}
