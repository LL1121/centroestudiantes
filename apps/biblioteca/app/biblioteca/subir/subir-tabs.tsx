'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Layers } from 'lucide-react'
import { useState } from 'react'

import { BulkUploadForm } from './bulk-upload-form'
import { UploadForm } from './upload-form'

type Mode = 'single' | 'bulk'

export function SubirTabs() {
  const [mode, setMode] = useState<Mode>('single')

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Modo de subida"
        className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-secondary/40 p-1"
      >
        <TabButton
          active={mode === 'single'}
          onClick={() => setMode('single')}
          icon={<FileText className="h-4 w-4" aria-hidden />}
          label="Individual"
        />
        <TabButton
          active={mode === 'bulk'}
          onClick={() => setMode('bulk')}
          icon={<Layers className="h-4 w-4" aria-hidden />}
          label="Múltiple"
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === 'single' ? (
          <motion.div
            key="single"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <UploadForm />
          </motion.div>
        ) : (
          <motion.div
            key="bulk"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              Ideal para cargar muchos libros de una. Cada archivo se sube como un material
              usando su nombre como título; compartís carrera y tags entre todos.
            </p>
            <BulkUploadForm />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors ${
        active
          ? 'bg-card text-primary shadow-sm'
          : 'text-muted-foreground hover:text-navy'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
