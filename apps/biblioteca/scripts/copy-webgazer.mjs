/**
 * Copia el bundle de WebGazer a public/webgazer/ para servirlo desde el mismo
 * origen (sin CDN, CSP-friendly). Se carga dinámicamente vía <script> en runtime.
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const destDir = join(root, 'public/webgazer')

function findDist() {
  try {
    const require = createRequire(join(root, 'package.json'))
    const pkg = require.resolve('webgazer/package.json')
    return join(dirname(pkg), 'dist')
  } catch {
    /* pnpm layout */
  }
  const flat = join(root, 'node_modules/webgazer/dist')
  if (existsSync(flat)) return flat
  const pnpmDir = join(root, 'node_modules/.pnpm')
  if (existsSync(pnpmDir)) {
    for (const entry of readdirSync(pnpmDir)) {
      if (!entry.startsWith('webgazer@')) continue
      const candidate = join(pnpmDir, entry, 'node_modules/webgazer/dist')
      if (existsSync(candidate)) return candidate
    }
  }
  return null
}

const dist = findDist()
if (!dist) {
  console.warn('[copy-webgazer] webgazer no instalado, omitiendo.')
  process.exit(0)
}

mkdirSync(destDir, { recursive: true })

// Solo el bundle UMD (expone window.webgazer); evitamos los source maps (~32MB).
copyFileSync(join(dist, 'webgazer.js'), join(destDir, 'webgazer.js'))

// Assets de face_mesh que WebGazer puede pedir en runtime.
const mp = join(dist, 'mediapipe')
if (existsSync(mp)) cpSync(mp, join(destDir, 'mediapipe'), { recursive: true })

console.log('[copy-webgazer] public/webgazer/ listo')
