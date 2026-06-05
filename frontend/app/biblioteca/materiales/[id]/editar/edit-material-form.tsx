'use client'

import { ChevronDown, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { MaterialRead } from '@/lib/api/types'
import { bibHref } from '@/lib/biblioteca-path'

interface Props {
  material: MaterialRead
}

type ApiErrorBody = { detail?: string }

export function EditMaterialForm({ material }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const [titulo, setTitulo] = useState(material.titulo)
  const [carrera, setCarrera] = useState(material.carrera ?? '')
  const [descripcion, setDescripcion] = useState(material.descripcion ?? '')
  const [tags, setTags] = useState((material.tags ?? []).join(', '))
  const [autor, setAutor] = useState(material.autor ?? '')
  const [anio, setAnio] = useState(
    material.anio_publicacion != null ? String(material.anio_publicacion) : '',
  )
  const [editorial, setEditorial] = useState(material.editorial ?? '')
  const [ciudad, setCiudad] = useState(material.ciudad_publicacion ?? '')
  const [isbn, setIsbn] = useState(material.isbn ?? '')
  const [apaOpen, setApaOpen] = useState(false)

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (titulo.trim().length < 2) {
      toast.error('El título debe tener al menos 2 caracteres.')
      return
    }
    const carreraTrim = carrera.trim()
    if (carreraTrim.length === 1) {
      toast.error('La carrera debe tener al menos 2 caracteres o quedar vacía.')
      return
    }

    const payload: Record<string, unknown> = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      carrera: carreraTrim || null,
      tags: tags
        .split(/[,;\n]+/)
        .map((t) => t.trim())
        .filter(Boolean),
      autor: autor.trim() || null,
      editorial: editorial.trim() || null,
      isbn: isbn.trim() || null,
      ciudad_publicacion: ciudad.trim() || null,
    }

    if (anio.trim()) {
      const year = Number.parseInt(anio.trim(), 10)
      if (Number.isNaN(year)) {
        toast.error('El año debe ser un número válido.')
        return
      }
      payload.anio_publicacion = year
    } else {
      payload.anio_publicacion = null
    }

    start(async () => {
      const response = await fetch(`/api/materials/${material.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorBody
        toast.error(body.detail ?? 'No pudimos guardar los cambios.')
        return
      }
      toast.success('Material actualizado')
      router.push(bibHref('/biblioteca'))
      router.refresh()
    })
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <Field
        label="Título"
        value={titulo}
        onChange={setTitulo}
        disabled={pending}
        required
        placeholder="Apuntes Matemática I"
      />
      <Field
        label="Carrera / materia (opcional)"
        value={carrera}
        onChange={setCarrera}
        disabled={pending}
        placeholder="Dejalo vacío si es lectura general"
      />
      <Field
        label="Descripción (opcional)"
        value={descripcion}
        onChange={setDescripcion}
        disabled={pending}
        as="textarea"
        placeholder="Resumen breve del contenido"
      />
      <Field
        label="Temas / tags (opcional)"
        value={tags}
        onChange={setTags}
        disabled={pending}
        placeholder="parcial, anatomía, 2025 — separados por coma"
      />

      <div className="rounded-xl border border-border bg-secondary/20">
        <button
          type="button"
          onClick={() => setApaOpen((open) => !open)}
          disabled={pending}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-navy transition-colors hover:bg-secondary/40 disabled:opacity-50"
          aria-expanded={apaOpen}
        >
          <span>Metadata para cita APA (opcional)</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${apaOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {apaOpen && (
          <div className="space-y-4 border-t border-border px-4 py-4">
            <Field label="Autor" value={autor} onChange={setAutor} disabled={pending} />
            <Field label="Año" value={anio} onChange={setAnio} disabled={pending} />
            <Field label="Editorial" value={editorial} onChange={setEditorial} disabled={pending} />
            <Field label="Ciudad" value={ciudad} onChange={setCiudad} disabled={pending} />
            <Field label="ISBN" value={isbn} onChange={setIsbn} disabled={pending} />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  required?: boolean
  placeholder?: string
  as?: 'input' | 'textarea'
}

function Field({ label, value, onChange, disabled, required, placeholder, as = 'input' }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-navy">{label}</span>
      {as === 'textarea' ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          rows={3}
          className="block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-navy outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className="block h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-navy outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
      )}
    </label>
  )
}
