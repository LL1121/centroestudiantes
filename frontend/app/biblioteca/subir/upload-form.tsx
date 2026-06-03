'use client'

import { ChevronDown, FileUp, Loader2, UploadCloud, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { bibHref } from '@/lib/biblioteca-path'

import {
  ACCEPT,
  ALLOWED_MIME,
  MAX_BYTES,
  type ApiErrorBody,
  type UploadResponse,
} from './upload-shared'

export function UploadForm() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [titulo, setTitulo] = useState('')
  const [carrera, setCarrera] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tags, setTags] = useState('')
  const [autor, setAutor] = useState('')
  const [anio, setAnio] = useState('')
  const [editorial, setEditorial] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [isbn, setIsbn] = useState('')
  const [apaOpen, setApaOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [pending, start] = useTransition()

  const onPickFile = (next: File | null) => {
    if (!next) {
      setFile(null)
      return
    }
    if (next.size > MAX_BYTES) {
      toast.error('El archivo supera el límite de 50 MB.')
      return
    }
    if (next.type && !ALLOWED_MIME.has(next.type)) {
      toast.error('Formato no soportado. Subí PDF, EPUB, JPEG o PNG.')
      return
    }
    setFile(next)
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) {
      toast.error('Adjuntá un archivo antes de continuar.')
      return
    }
    if (titulo.trim().length < 2 || carrera.trim().length < 2) {
      toast.error('Completá título y carrera (mínimo 2 caracteres).')
      return
    }

    const data = new FormData()
    data.append('file', file)
    data.append('titulo', titulo.trim())
    data.append('carrera', carrera.trim())
    if (descripcion.trim()) data.append('descripcion', descripcion.trim())
    if (tags.trim()) data.append('tags', tags.trim())
    if (autor.trim()) data.append('autor', autor.trim())
    if (anio.trim()) data.append('anio_publicacion', anio.trim())
    if (editorial.trim()) data.append('editorial', editorial.trim())
    if (ciudad.trim()) data.append('ciudad_publicacion', ciudad.trim())
    if (isbn.trim()) data.append('isbn', isbn.trim())

    start(async () => {
      const response = await fetch('/api/materials/upload', { method: 'POST', body: data })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorBody
        toast.error(body.detail ?? 'No pudimos procesar el archivo.')
        return
      }
      const json = (await response.json()) as UploadResponse
      const tituloFinal = json.material.titulo || titulo.trim() || 'Material'
      toast.success(
        json.deduplicated
          ? `Ya existía "${tituloFinal}" en la biblioteca.`
          : `"${tituloFinal}" subido con éxito`,
      )
      setFile(null)
      setTitulo('')
      setCarrera('')
      setDescripcion('')
      setTags('')
      setAutor('')
      setAnio('')
      setEditorial('')
      setCiudad('')
      setIsbn('')
      setApaOpen(false)
      if (inputRef.current) inputRef.current.value = ''
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
        label="Carrera"
        value={carrera}
        onChange={setCarrera}
        disabled={pending}
        required
        placeholder="Profesorado en Ciencias de la Educación"
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
            <p className="text-xs text-muted-foreground">
              Si no completás estos campos, intentaremos inferirlos del documento al generar la cita.
            </p>
            <Field
              label="Autor"
              value={autor}
              onChange={setAutor}
              disabled={pending}
              placeholder="Apellido, N."
            />
            <Field
              label="Año de publicación"
              value={anio}
              onChange={setAnio}
              disabled={pending}
              placeholder="2024"
            />
            <Field
              label="Editorial"
              value={editorial}
              onChange={setEditorial}
              disabled={pending}
              placeholder="Editorial Ejemplo"
            />
            <Field
              label="Ciudad de publicación"
              value={ciudad}
              onChange={setCiudad}
              disabled={pending}
              placeholder="Buenos Aires"
            />
            <Field
              label="ISBN"
              value={isbn}
              onChange={setIsbn}
              disabled={pending}
              placeholder="978-..."
            />
          </div>
        )}
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (pending) return
          const dropped = event.dataTransfer.files?.[0] ?? null
          onPickFile(dropped)
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-border bg-secondary/40'
        } ${pending ? 'pointer-events-none opacity-60' : ''}`}
      >
        {file ? (
          <div className="flex w-full items-center justify-between gap-3 rounded-lg bg-card px-3 py-2 text-left shadow-sm">
            <div className="flex min-w-0 items-center gap-2">
              <FileUp className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-navy">{file.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPickFile(null)}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-navy"
              aria-label="Quitar archivo"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : (
          <>
            <UploadCloud className="h-7 w-7 text-primary" aria-hidden />
            <p className="text-sm font-medium text-navy">
              Arrastrá tu archivo o{' '}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-primary underline-offset-2 hover:underline"
              >
                buscalo en tu dispositivo
              </button>
            </p>
            <p className="text-[11px] text-muted-foreground">PDF, EPUB, JPEG o PNG · hasta 50 MB</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => onPickFile(event.target.files?.[0] ?? null)}
        />
      </div>

      <button
        type="submit"
        disabled={pending || !file}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {pending ? 'Subiendo…' : 'Subir material'}
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
