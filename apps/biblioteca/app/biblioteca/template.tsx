'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

// Next re-monta el `template` en cada navegación, así que sirve para animar la
// entrada de cada página (catálogo, login, registro, subir, visor…).
// Es flex-col + flex-1 para no romper la altura completa del visor `/leer`.
export default function BibliotecaTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="flex w-full flex-1 flex-col"
    >
      {children}
    </motion.div>
  )
}
