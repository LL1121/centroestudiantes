'use client'

/**
 * Modo B (gama baja): control por inclinación de cabeza (head tilt).
 *
 * Algoritmo ligero: se dibuja el video en un canvas oculto de 48x48 px en escala
 * de grises y se mide el desplazamiento vertical del "centroide de movimiento"
 * (diferencia de fotogramas). Un cabeceo brusco hacia abajo dispara onNext().
 *
 * También monitorea los FPS: si el dispositivo degrada el rendimiento por debajo
 * de un mínimo sostenido, llama onDegraded() para que el orquestador active el
 * fallback de scroll automático.
 */
import { Kalman1D } from './kalman'

const SIZE = 48
const DOWN_VELOCITY = 1.1 // px (en grilla 48) por frame hacia abajo
const MOTION_MIN = 16 // energía mínima de movimiento para considerar válido
const DWELL_FRAMES = 2 // frames consecutivos de cabeceo
const COOLDOWN_MS = 2000
const LOW_FPS = 10
const LOW_FPS_WINDOW_MS = 4000

export interface HeadTiltHandle {
  stop: () => void
  setPaused: (paused: boolean) => void
}

export interface HeadTiltCallbacks {
  onNext: () => void
  onDegraded?: () => void
  onActive?: () => void
}

export async function startHeadTilt({
  onNext,
  onDegraded,
  onActive,
}: HeadTiltCallbacks): Promise<HeadTiltHandle> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    throw new DOMException('getUserMedia no disponible', 'NotSupportedError')
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
    audio: false,
  })

  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.srcObject = stream
  await video.play()
  onActive?.()

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    stream.getTracks().forEach((t) => t.stop())
    throw new Error('No se pudo crear el contexto 2D')
  }

  let prevGray: Float32Array | null = null
  const centroidKalman = new Kalman1D(0.2, 1.5)
  let prevCentroid = Number.NaN
  let downStreak = 0
  let cooldownUntil = 0
  let paused = false
  let raf = 0

  // Monitoreo de FPS.
  let frames = 0
  let windowStart = performance.now()
  let degraded = false

  const toGray = (data: Uint8ClampedArray): Float32Array => {
    const gray = new Float32Array(SIZE * SIZE)
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
      gray[i] = 0.299 * data[p]! + 0.587 * data[p + 1]! + 0.114 * data[p + 2]!
    }
    return gray
  }

  const loop = () => {
    raf = requestAnimationFrame(loop)
    if (paused || video.readyState < 2) return

    // FPS.
    frames++
    const nowFps = performance.now()
    if (nowFps - windowStart >= LOW_FPS_WINDOW_MS) {
      const fps = (frames * 1000) / (nowFps - windowStart)
      frames = 0
      windowStart = nowFps
      if (fps < LOW_FPS && !degraded) {
        degraded = true
        onDegraded?.()
        return
      }
    }

    ctx.drawImage(video, 0, 0, SIZE, SIZE)
    const gray = toGray(ctx.getImageData(0, 0, SIZE, SIZE).data)

    if (prevGray) {
      // Centroide vertical de la diferencia entre fotogramas.
      let weightedRow = 0
      let energy = 0
      for (let y = 0; y < SIZE; y++) {
        let rowDiff = 0
        for (let x = 0; x < SIZE; x++) {
          const idx = y * SIZE + x
          rowDiff += Math.abs(gray[idx]! - prevGray[idx]!)
        }
        weightedRow += rowDiff * y
        energy += rowDiff
      }

      if (energy > MOTION_MIN * SIZE) {
        const centroid = centroidKalman.filter(weightedRow / energy)
        if (!Number.isNaN(prevCentroid)) {
          const velocity = centroid - prevCentroid // >0 => movimiento hacia abajo
          if (velocity >= DOWN_VELOCITY) {
            downStreak++
            const now = performance.now()
            if (downStreak >= DWELL_FRAMES && now >= cooldownUntil) {
              onNext()
              cooldownUntil = now + COOLDOWN_MS
              downStreak = 0
            }
          } else if (velocity < 0) {
            downStreak = 0
          }
        }
        prevCentroid = centroid
      } else {
        downStreak = 0
      }
    }
    prevGray = gray
  }

  raf = requestAnimationFrame(loop)

  return {
    stop: () => {
      cancelAnimationFrame(raf)
      stream.getTracks().forEach((t) => t.stop())
      video.srcObject = null
    },
    setPaused: (p: boolean) => {
      paused = p
      downStreak = 0
    },
  }
}
