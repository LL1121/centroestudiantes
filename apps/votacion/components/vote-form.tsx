'use client'

import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'

import { ProfessorCombobox } from '@/components/professor-combobox'
import type { Profesor } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  professors: Profesor[]
  onVoted: () => void
}

function isValidDni(value: string): boolean {
  return /^\d{7,8}$/.test(value.trim())
}

export function VoteForm({ professors, onVoted }: Props) {
  const [profesorId, setProfesorId] = useState<string | null>(null)
  const [nombreApellido, setNombreApellido] = useState('')
  const [carrera, setCarrera] = useState('')
  const [dni, setDni] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!profesorId) next.profesor = 'Elegí un profesor'
    if (nombreApellido.trim().length < 2) next.nombre = 'Ingresá tu nombre y apellido'
    if (carrera.trim().length < 2) next.carrera = 'Ingresá tu carrera'
    if (!isValidDni(dni)) next.dni = 'El DNI debe tener 7 u 8 dígitos numéricos'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (!validate() || !profesorId) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/voting/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profesor_id: profesorId,
          nombre_apellido: nombreApellido.trim(),
          carrera: carrera.trim(),
          dni: dni.trim(),
        }),
      })

      if (res.status === 409) {
        const body = (await res.json().catch(() => null)) as { detail?: string } | null
        setFormError(body?.detail ?? 'Este DNI ya emitió un voto')
        return
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { detail?: string } | null
        setFormError(body?.detail ?? 'No se pudo registrar el voto. Intentá de nuevo.')
        return
      }

      onVoted()
    } catch {
      setFormError('Error de red. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3.5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <div>
        <h2 className="font-serif text-lg font-bold text-navy">Emití tu voto</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Un solo voto por DNI. Elegí al docente y completá tus datos.
        </p>
      </div>

      <ProfessorCombobox
        professors={professors}
        value={profesorId}
        onChange={setProfesorId}
        disabled={submitting}
        error={fieldErrors.profesor}
      />

      <Field
        label="Nombre y apellido"
        error={fieldErrors.nombre}
      >
        <input
          value={nombreApellido}
          onChange={(e) => setNombreApellido(e.target.value)}
          disabled={submitting}
          autoComplete="name"
          className={inputClass(fieldErrors.nombre)}
          placeholder="Ej: Ana Pérez"
        />
      </Field>

      <Field label="Carrera" error={fieldErrors.carrera}>
        <input
          value={carrera}
          onChange={(e) => setCarrera(e.target.value)}
          disabled={submitting}
          className={inputClass(fieldErrors.carrera)}
          placeholder="Ej: Tecnicatura en …"
        />
      </Field>

      <Field label="DNI" error={fieldErrors.dni}>
        <input
          value={dni}
          onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
          disabled={submitting}
          inputMode="numeric"
          autoComplete="off"
          className={inputClass(fieldErrors.dni)}
          placeholder="7 u 8 dígitos"
        />
      </Field>

      {formError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className={cn(
          'inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors',
          'hover:bg-primary/90 disabled:opacity-60',
        )}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Enviando…
          </>
        ) : (
          'Confirmar voto'
        )}
      </button>
    </form>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-navy">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  )
}

function inputClass(error?: string) {
  return cn(
    'h-12 w-full rounded-xl border bg-white px-3 text-sm outline-none transition-colors',
    'placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
    error ? 'border-destructive' : 'border-input',
  )
}
