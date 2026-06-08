/**
 * Copia runtime wasm de @mediapipe/tasks-vision y el modelo face_landmarker
 * a public/mediapipe/ para servirlos desde el mismo origen (sin CDN en runtime).
 */
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const destDir = join(root, 'public/mediapipe')
const wasmDest = join(destDir, 'wasm')
const modelDest = join(destDir, 'face_landmarker.task')

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

function findPackageRoot() {
  try {
    const require = createRequire(join(root, 'package.json'))
    const pkg = require.resolve('@mediapipe/tasks-vision/package.json')
    return dirname(pkg)
  } catch {
    // pnpm layout
  }
  const flat = join(root, 'node_modules/@mediapipe/tasks-vision')
  if (existsSync(flat)) return flat
  const pnpmDir = join(root, 'node_modules/.pnpm')
  if (existsSync(pnpmDir)) {
    for (const entry of readdirSync(pnpmDir)) {
      if (!entry.startsWith('@mediapipe+tasks-vision@')) continue
      const candidate = join(pnpmDir, entry, 'node_modules/@mediapipe/tasks-vision')
      if (existsSync(candidate)) return candidate
    }
  }
  return null
}

async function ensureModel() {
  if (existsSync(modelDest)) return
  console.log('[copy-mediapipe] descargando face_landmarker.task…')
  const res = await fetch(MODEL_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar modelo`)
  const buf = Buffer.from(await res.arrayBuffer())
  mkdirSync(destDir, { recursive: true })
  writeFileSync(modelDest, buf)
}

const pkgRoot = findPackageRoot()
if (!pkgRoot) {
  console.warn('[copy-mediapipe] @mediapipe/tasks-vision no instalado, omitiendo.')
  process.exit(0)
}

const wasmSrc = join(pkgRoot, 'wasm')
if (!existsSync(wasmSrc)) {
  console.warn('[copy-mediapipe] carpeta wasm no encontrada en el paquete.')
  process.exit(0)
}

mkdirSync(destDir, { recursive: true })
cpSync(wasmSrc, wasmDest, { recursive: true })

try {
  await ensureModel()
} catch (err) {
  console.warn('[copy-mediapipe] no se pudo descargar el modelo:', err.message)
  console.warn('  La lectura predictiva requerirá red en el primer deploy.')
}

console.log('[copy-mediapipe] public/mediapipe/ listo')
