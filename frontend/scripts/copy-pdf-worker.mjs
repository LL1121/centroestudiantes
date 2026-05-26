/**
 * Copia el worker de pdfjs-dist a public/ para servirlo desde el mismo origen.
 * Evita fallos de CSP/CORS/MIME al cargar desde CDN en producción.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const destDir = join(root, 'public')
const dest = join(destDir, 'pdf.worker.min.mjs')

function findWorkerSource() {
  try {
    const require = createRequire(join(root, 'package.json'))
    return require.resolve('pdfjs-dist/build/pdf.worker.min.mjs')
  } catch {
    // pnpm: pdfjs-dist suele estar solo bajo .pnpm (transitivo de react-pdf)
  }

  const flat = join(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs')
  if (existsSync(flat)) return flat

  const pnpmDir = join(root, 'node_modules/.pnpm')
  if (existsSync(pnpmDir)) {
    for (const entry of readdirSync(pnpmDir)) {
      if (!entry.startsWith('pdfjs-dist@')) continue
      const candidate = join(
        pnpmDir,
        entry,
        'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
      )
      if (existsSync(candidate)) return candidate
    }
  }

  return null
}

const src = findWorkerSource()
if (!src) {
  console.warn('[copy-pdf-worker] pdfjs-dist no instalado aún, omitiendo.')
  process.exit(0)
}

mkdirSync(destDir, { recursive: true })
copyFileSync(src, dest)
console.log('[copy-pdf-worker] public/pdf.worker.min.mjs')
