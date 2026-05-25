'use client'

import { Download, ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'

interface Props {
  fileUrl: string
  titulo: string
}

const STEP = 0.25
const MIN = 0.5
const MAX = 4

export function ImageViewer({ fileUrl, titulo }: Props) {
  const [scale, setScale] = useState(1)

  const zoomIn = () => setScale((s) => Math.min(MAX, +(s + STEP).toFixed(2)))
  const zoomOut = () => setScale((s) => Math.max(MIN, +(s - STEP).toFixed(2)))

  return (
    <section className="mt-4 flex flex-1 flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <ToolbarButton onClick={zoomOut} aria-label="Reducir">
            <ZoomOut className="h-4 w-4" />
          </ToolbarButton>
          <span className="px-2 text-xs font-medium tabular-nums text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <ToolbarButton onClick={zoomIn} aria-label="Ampliar">
            <ZoomIn className="h-4 w-4" />
          </ToolbarButton>
        </div>
        <a
          href={fileUrl}
          download
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-navy transition-colors hover:border-primary/40"
        >
          <Download className="h-3.5 w-3.5" />
          Descargar
        </a>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto rounded-xl bg-secondary/30 p-3">
        {/* Imagen estática del backend, fuera del optimizador de Next */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={titulo}
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
          className="max-h-[80vh] max-w-full origin-center rounded-lg shadow-md transition-transform"
        />
      </div>
    </section>
  )
}

function ToolbarButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-navy transition-colors hover:border-primary/40 disabled:opacity-50"
    >
      {children}
    </button>
  )
}
