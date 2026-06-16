'use client'

import { Download, Loader2, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { READING_SURFACE, type ReadingTheme } from '@/lib/reading-theme'

import {
  ReaderZoomControls,
  useContainerSize,
  useImmersive,
  useReaderTouchGestures,
} from './reader-controls'

interface Props {
  fileUrl: string
  titulo: string
  readingTheme: ReadingTheme
}

const STEP = 0.25
const MIN = 0.5
const MAX = 4

export function ImageViewer({ fileUrl, titulo, readingTheme }: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { immersive, toggle: toggleImmersive, exit: exitImmersive } =
    useImmersive(sectionRef)
  const containerSize = useContainerSize(containerRef)
  const [scale, setScale] = useState(1)
  const [loaded, setLoaded] = useState(false)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)

  const aspect = natural ? natural.w / natural.h : null
  const fitBaseWidth =
    containerSize && aspect
      ? Math.min(
          containerSize.width - 24,
          (containerSize.height - 24) * aspect,
        )
      : null

  const zoomIn = () => setScale((s) => Math.min(MAX, +(s + STEP).toFixed(2)))
  const zoomOut = () => setScale((s) => Math.max(MIN, +(s - STEP).toFixed(2)))
  const resetFit = useCallback(() => setScale(1), [])

  const touchGestures = useReaderTouchGestures(
    { onPrev: () => {}, onNext: () => {} },
    {
      scale,
      onScaleChange: setScale,
      minScale: MIN,
      maxScale: MAX,
      onFit: resetFit,
    },
  )

  const displayWidth = fitBaseWidth
    ? `${Math.round(fitBaseWidth * scale)}px`
    : scale === 1
      ? '100%'
      : `${Math.round(scale * 100)}%`

  return (
    <section
      ref={sectionRef}
      className={
        immersive
          ? 'fixed inset-0 z-60 flex h-dvh flex-col bg-card'
          : 'flex min-h-0 flex-1 flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4'
      }
    >
      {!immersive && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <ToolbarButton onClick={zoomOut} disabled={scale <= MIN} aria-label="Reducir">
              <ZoomOut className="h-4 w-4" />
            </ToolbarButton>
            <span className="px-2 text-xs font-medium tabular-nums text-muted-foreground">
              {Math.round(scale * 100)}%
            </span>
            <ToolbarButton onClick={zoomIn} disabled={scale >= MAX} aria-label="Ampliar">
              <ZoomIn className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={toggleImmersive} aria-label="Pantalla completa">
              <Maximize2 className="h-4 w-4" />
            </ToolbarButton>
          </div>
          <a
            href={fileUrl}
            download
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-navy transition-colors hover:border-primary/40 sm:ml-auto sm:h-8 sm:w-auto"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar
          </a>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        <div
          ref={containerRef}
          {...touchGestures}
          className={`flex flex-1 items-center justify-center overflow-auto p-3 ${
            immersive ? 'min-h-0' : 'rounded-xl'
          } ${READING_SURFACE[readingTheme]}`}
        >
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando imagen…
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={titulo}
            onLoad={(e) => {
              const img = e.currentTarget
              setNatural({ w: img.naturalWidth, h: img.naturalHeight })
              setLoaded(true)
            }}
            style={{ width: displayWidth, maxWidth: 'none' }}
            className="h-auto shrink-0 rounded-lg shadow-md"
          />
        </div>

        {immersive && (
          <>
            <button
              type="button"
              aria-label="Salir de pantalla completa"
              onClick={exitImmersive}
              className="absolute right-3 top-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full bg-navy/70 text-white shadow-lg backdrop-blur"
            >
              <Minimize2 className="h-5 w-5" />
            </button>
            <ReaderZoomControls
              visible
              scale={scale}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onFit={resetFit}
            />
          </>
        )}
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
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-navy transition-colors hover:border-primary/40 disabled:opacity-50 sm:h-8 sm:w-8"
    >
      {children}
    </button>
  )
}
