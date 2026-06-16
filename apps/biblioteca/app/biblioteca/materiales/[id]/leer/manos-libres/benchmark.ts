/**
 * Benchmark de rendimiento del cliente (stress test corto, <200ms).
 *
 * Mide cuántas operaciones de punto flotante logra el dispositivo dentro de una
 * ventana fija de tiempo y lo combina con núcleos y memoria reportados. Sirve
 * para decidir entre el Modo A (seguimiento ocular, costoso) y el Modo B.
 */

export interface BenchmarkResult {
  /** Operaciones (en miles) por milisegundo. Mayor = más rápido. */
  opsPerMs: number
  durationMs: number
  cores: number
  /** GB de RAM aproximados (solo Chromium). */
  memoryGb: number
  highEnd: boolean
}

const BUDGET_MS = 150
const BATCH = 20_000
// Umbrales heurísticos: equipos de escritorio modernos superan ampliamente
// estos valores; celulares de gama baja quedan por debajo.
const MIN_OPS_PER_MS = 6
const MIN_CORES = 4
const MIN_MEMORY_GB = 4

/** Ejecuta el stress test de forma síncrona (bloquea ~150ms, una sola vez). */
export function runPerformanceBenchmark(): BenchmarkResult {
  const start = performance.now()
  let acc = 0
  let iterations = 0

  while (performance.now() - start < BUDGET_MS) {
    for (let i = 1; i <= BATCH; i++) {
      acc += Math.sqrt(i * 1.0001) * Math.sin(i) + Math.cos(acc % 7)
    }
    iterations += BATCH
  }

  const durationMs = performance.now() - start
  // Evita que el motor JIT elimine el bucle por "dead code".
  if (!Number.isFinite(acc)) {
    // eslint-disable-next-line no-console
    console.debug('benchmark acc', acc)
  }

  const cores =
    typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2
  const memoryGb =
    typeof navigator !== 'undefined'
      ? ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 2)
      : 2

  const opsPerMs = iterations / 1000 / durationMs
  const highEnd =
    opsPerMs >= MIN_OPS_PER_MS && cores >= MIN_CORES && memoryGb >= MIN_MEMORY_GB

  return { opsPerMs, durationMs, cores, memoryGb, highEnd }
}
