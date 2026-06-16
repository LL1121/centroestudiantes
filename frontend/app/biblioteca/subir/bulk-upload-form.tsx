'use client'

import {
  CheckCircle2,
  FileUp,
  Loader2,
  RotateCcw,
  UploadCloud,
  X,
  XCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { ContentKind } from '@/lib/copyright'
import { isCopyrightEnabled } from '@/lib/copyright'

import {
  appendRightsToFormData,
  RightsDeclarationBlock,
  validateRightsSubmission,
} from '../_components/rights-declaration'
import {
  ACCEPT,
  type ApiErrorBody,
  formatBytes,
  titleFromFilename,
  type UploadResponse,
  validateFile,
} from './upload-shared'

type ItemStatus = 'queued' | 'uploading' | 'done' | 'dedup' | 'error'

interface BulkItem {
  id: string
  file: File
  titulo: string
  status: ItemStatus
  error?: string
}

/** Cantidad de subidas en paralelo. Bajo para no saturar el backend/pipeline. */
const CONCURRENCY = 3

export function BulkUploadForm() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [carrera, setCarrera] = useState('')
  const [tags, setTags] = useState('')
  const [contentKind, setContentKind] = useState<ContentKind | ''>('')
  const [rightsAccepted, setRightsAccepted] = useState(false)
  const [items, setItems] = useState<BulkItem[]>([])
  const [dragging, setDragging] = useState(false)
  const [running, setRunning] = useState(false)

  const addFiles = useCallback((fileList: FileList | File[] | null) => {
    if (!fileList) return
    const incoming = Array.from(fileList)
    const accepted: BulkItem[] = []
    let rejected = 0

    for (const file of incoming) {
      const error = validateFile(file)
      if (error) {
        rejected += 1
        continue
      }
      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        titulo: titleFromFilename(file.name),
        status: 'queued',
      })
    }

    if (rejected > 0) {
      toast.error(
        `${rejected} archivo${rejected > 1 ? 's' : ''} ignorado${rejected > 1 ? 's' : ''} (formato o tamaño no válido).`,
      )
    }
    if (accepted.length > 0) {
      setItems((prev) => {
        // Evita duplicados exactos (mismo nombre + tamaño + fecha) ya en cola.
        const seen = new Set(prev.map((it) => `${it.file.name}-${it.file.size}-${it.file.lastModified}`))
        const fresh = accepted.filter(
          (it) => !seen.has(`${it.file.name}-${it.file.size}-${it.file.lastModified}`),
        )
        return [...prev, ...fresh]
      })
    }
  }, [])

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const updateTitle = (id: string, titulo: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, titulo } : it)))
  }

  const clearFinished = () => {
    setItems((prev) => prev.filter((it) => it.status === 'queued' || it.status === 'error'))
  }

  const counts = useMemo(() => {
    return items.reduce(
      (acc, it) => {
        acc[it.status] += 1
        return acc
      },
      { queued: 0, uploading: 0, done: 0, dedup: 0, error: 0 } as Record<ItemStatus, number>,
    )
  }, [items])

  const setStatus = (id: string, status: ItemStatus, error?: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status, error } : it)))
  }

  const uploadOne = async (item: BulkItem): Promise<'ok' | 'error'> => {
    setStatus(item.id, 'uploading')
    const data = new FormData()
    data.append('file', item.file)
    data.append('titulo', item.titulo.trim() || titleFromFilename(item.file.name))
    if (carrera.trim()) data.append('carrera', carrera.trim())
    if (tags.trim()) data.append('tags', tags.trim())
    if (isCopyrightEnabled() && contentKind) appendRightsToFormData(data, contentKind)

    try {
      const response = await fetch('/api/materials/upload', { method: 'POST', body: data })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorBody
        setStatus(item.id, 'error', body.detail ?? 'Error al subir')
        return 'error'
      }
      const json = (await response.json()) as UploadResponse
      setStatus(item.id, json.deduplicated ? 'dedup' : 'done')
      return 'ok'
    } catch {
      setStatus(item.id, 'error', 'Error de red')
      return 'error'
    }
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (running) return
    const carreraTrim = carrera.trim()
    if (carreraTrim.length === 1) {
      toast.error('La carrera debe tener al menos 2 caracteres o quedar vacía.')
      return
    }
    const rightsError = isCopyrightEnabled()
      ? validateRightsSubmission(contentKind, rightsAccepted)
      : null
    if (rightsError) {
      toast.error(rightsError)
      return
    }
    const pending = items.filter((it) => it.status === 'queued' || it.status === 'error')
    if (pending.length === 0) {
      toast.error('Agregá al menos un archivo para subir.')
      return
    }

    setRunning(true)
    // Resetea los que estaban en error para reintento.
    setItems((prev) =>
      prev.map((it) => (it.status === 'error' ? { ...it, status: 'queued', error: undefined } : it)),
    )

    const queue = [...pending]
    let okCount = 0
    let errCount = 0

    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const result = await uploadOne(next)
        if (result === 'ok') okCount += 1
        else errCount += 1
      }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker())
    await Promise.all(workers)

    setRunning(false)

    if (errCount === 0) {
      toast.success(`Se subieron ${okCount} material${okCount === 1 ? '' : 'es'}.`)
      router.refresh()
    } else {
      toast.warning(`${okCount} subido(s), ${errCount} con error. Revisá la lista y reintentá.`)
    }
  }

  const hasPending = items.some((it) => it.status === 'queued' || it.status === 'error')
  const totalSize = items.reduce((acc, it) => acc + it.file.size, 0)

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-navy">Carrera / materia (opcional, para todos)</span>
        <input
          type="text"
          value={carrera}
          onChange={(e) => setCarrera(e.target.value)}
          disabled={running}
          placeholder="Dejalo vacío si es lectura general"
          className="block h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-navy outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-navy">Temas / tags (opcional, para todos)</span>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          disabled={running}
          placeholder="parcial, anatomía, 2025 — separados por coma"
          className="block h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-navy outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
      </label>

      {isCopyrightEnabled() && (
        <RightsDeclarationBlock
          contentKind={contentKind}
          onContentKindChange={setContentKind}
          rightsAccepted={rightsAccepted}
          onRightsAcceptedChange={setRightsAccepted}
          disabled={running}
        />
      )}

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (running) return
          addFiles(event.dataTransfer.files)
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-border bg-secondary/40'
        } ${running ? 'pointer-events-none opacity-60' : ''}`}
      >
        <UploadCloud className="h-7 w-7 text-primary" aria-hidden />
        <p className="text-sm font-medium text-navy">
          Arrastrá varios archivos o{' '}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-primary underline-offset-2 hover:underline"
          >
            buscalos en tu dispositivo
          </button>
        </p>
        <p className="text-[11px] text-muted-foreground">
          PDF, EPUB, JPEG o PNG · hasta 50 MB cada uno · el título sale del nombre del archivo
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => {
            addFiles(event.target.files)
            if (inputRef.current) inputRef.current.value = ''
          }}
        />
      </div>

      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-navy">
              {items.length} archivo{items.length === 1 ? '' : 's'} · {formatBytes(totalSize)}
            </p>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {counts.done > 0 && <span className="text-emerald-600">{counts.done} ok</span>}
              {counts.dedup > 0 && <span>{counts.dedup} ya existía(n)</span>}
              {counts.error > 0 && <span className="text-destructive">{counts.error} error</span>}
              {!running && (counts.done > 0 || counts.dedup > 0) && (
                <button
                  type="button"
                  onClick={clearFinished}
                  className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-primary"
                >
                  <X className="h-3 w-3" /> Limpiar completados
                </button>
              )}
            </div>
          </div>

          <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
              >
                <StatusIcon status={item.status} />
                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    value={item.titulo}
                    onChange={(e) => updateTitle(item.id, e.target.value)}
                    disabled={running || item.status === 'done' || item.status === 'dedup'}
                    className="block w-full truncate rounded border border-transparent bg-transparent text-sm font-medium text-navy outline-none transition-colors hover:border-border focus:border-primary disabled:opacity-70"
                    aria-label={`Título de ${item.file.name}`}
                  />
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.file.name} · {formatBytes(item.file.size)}
                    {item.error ? ` · ${item.error}` : ''}
                  </p>
                </div>
                {!running && item.status !== 'done' && item.status !== 'dedup' && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-navy"
                    aria-label={`Quitar ${item.file.name}`}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={running || !hasPending}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Subiendo {counts.uploading > 0 ? `(${counts.done + counts.dedup}/${items.length})` : '…'}
          </>
        ) : counts.error > 0 ? (
          <>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reintentar pendientes
          </>
        ) : (
          'Subir todos'
        )}
      </button>
    </form>
  )
}

function StatusIcon({ status }: { status: ItemStatus }) {
  switch (status) {
    case 'uploading':
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
    case 'done':
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
    case 'dedup':
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    case 'error':
      return <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
    default:
      return <FileUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
  }
}
