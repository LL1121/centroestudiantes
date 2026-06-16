'use client'

/**
 * Modo A (gama alta): seguimiento ocular con WebGazer.js + filtro de Kalman.
 *
 * Si la coordenada Y suavizada permanece en el 15% inferior de la ventana
 * durante DWELL_MS continuos, dispara onNext(). Devuelve una promesa de arranque
 * que rechaza si WebGazer no logra inicializar la cámara (para caer al Modo B).
 */
import { Kalman1D } from './kalman'
import {
  applyGazeDotAccent,
  loadWebgazer,
  type GazeData,
  type WebGazer,
} from './webgazer-types'

const DWELL_MS = 1200
const COOLDOWN_MS = 2000
const BOTTOM_RATIO = 0.85
const FIRST_DATA_TIMEOUT_MS = 8000

export interface EyeTrackingHandle {
  stop: () => void
  setPaused: (paused: boolean) => void
}

export interface EyeTrackingCallbacks {
  onNext: () => void
  onGaze?: (data: GazeData) => void
  onFirstData?: () => void
}

/** Inicializa el seguimiento ocular. Rechaza si la cámara no arranca. */
export async function startEyeTracking({
  onNext,
  onGaze,
  onFirstData,
}: EyeTrackingCallbacks): Promise<EyeTrackingHandle> {
  const webgazer: WebGazer = await loadWebgazer()

  const kx = new Kalman1D(0.08, 3)
  const ky = new Kalman1D(0.08, 3)

  let paused = false
  let dwellStart: number | null = null
  let cooldownUntil = 0
  let gotData = false

  webgazer.setRegression('ridge').setGazeListener((data) => {
    if (!data || paused) {
      dwellStart = null
      return
    }
    if (!gotData) {
      gotData = true
      onFirstData?.()
    }

    const x = kx.filter(data.x)
    const y = ky.filter(data.y)
    onGaze?.({ x, y })

    const now = performance.now()
    const threshold = window.innerHeight * BOTTOM_RATIO

    if (y >= threshold) {
      if (dwellStart === null) dwellStart = now
      else if (now - dwellStart >= DWELL_MS && now >= cooldownUntil) {
        onNext()
        cooldownUntil = now + COOLDOWN_MS
        dwellStart = null
      }
    } else {
      dwellStart = null
    }
  })

  try {
    await webgazer.begin()
  } catch (err) {
    try {
      webgazer.end()
    } catch {
      /* noop */
    }
    throw err instanceof Error ? err : new Error('WebGazer no pudo iniciar')
  }

  webgazer.showVideo(false)
  webgazer.showFaceOverlay(false)
  webgazer.showFaceFeedbackBox(false)
  webgazer.showPredictionPoints(true)
  applyGazeDotAccent()

  // Si la cámara nunca entrega datos (permiso denegado tras begin, sensor
  // ocupado, etc.), abortamos para que el orquestador caiga al Modo B.
  await new Promise<void>((resolve, reject) => {
    if (gotData) {
      resolve()
      return
    }
    const startedAt = performance.now()
    const check = () => {
      if (gotData) {
        resolve()
        return
      }
      if (performance.now() - startedAt >= FIRST_DATA_TIMEOUT_MS) {
        reject(new Error('WebGazer no entregó datos de mirada'))
        return
      }
      window.setTimeout(check, 250)
    }
    check()
  }).catch((err) => {
    try {
      webgazer.end()
    } catch {
      /* noop */
    }
    throw err
  })

  return {
    stop: () => {
      try {
        webgazer.clearGazeListener()
        webgazer.end()
      } catch {
        /* noop */
      }
    },
    setPaused: (p: boolean) => {
      paused = p
      dwellStart = null
      try {
        if (p) webgazer.pause()
        else webgazer.resume()
      } catch {
        /* noop */
      }
    },
  }
}
