/** Utilidades de lectura predictiva (gaze vertical + persistencia). */

export const PREDICTIVE_STORAGE_KEY = 'centro-predictive-reading'

export interface PredictiveCalibration {
  top: number
  bottom: number
}

export interface PredictivePrefs {
  calibration: PredictiveCalibration | null
}

export function loadPredictivePrefs(): PredictivePrefs {
  if (typeof window === 'undefined') return { calibration: null }
  try {
    const raw = localStorage.getItem(PREDICTIVE_STORAGE_KEY)
    if (!raw) return { calibration: null }
    const parsed = JSON.parse(raw) as PredictivePrefs
    if (
      parsed.calibration &&
      typeof parsed.calibration.top === 'number' &&
      typeof parsed.calibration.bottom === 'number'
    ) {
      return parsed
    }
  } catch {
    /* ignore */
  }
  return { calibration: null }
}

export function savePredictiveCalibration(calibration: PredictiveCalibration): void {
  localStorage.setItem(
    PREDICTIVE_STORAGE_KEY,
    JSON.stringify({ calibration } satisfies PredictivePrefs),
  )
}

export function clearPredictiveCalibration(): void {
  localStorage.removeItem(PREDICTIVE_STORAGE_KEY)
}

/** Landmarks MediaPipe Face Landmarker (refineLandmarks). */
const L = {
  forehead: 10,
  nose: 1,
  chin: 152,
  leftTop: 159,
  leftBottom: 145,
  rightTop: 386,
  rightBottom: 374,
  leftIris: 468,
  rightIris: 473,
} as const

type Landmark = { x: number; y: number; z?: number }

function eyeVerticalRatio(
  landmarks: Landmark[],
  iris: number,
  top: number,
  bottom: number,
): number {
  const span = landmarks[bottom]!.y - landmarks[top]!.y
  if (Math.abs(span) < 1e-5) return 0.5
  const raw = (landmarks[iris]!.y - landmarks[top]!.y) / span
  return Math.max(0, Math.min(1, raw))
}

/** 0 = mirando arriba, 1 = mirando abajo (aprox.). */
export function computeVerticalGazeScore(landmarks: Landmark[]): number {
  const left = eyeVerticalRatio(landmarks, L.leftIris, L.leftTop, L.leftBottom)
  const right = eyeVerticalRatio(landmarks, L.rightIris, L.rightTop, L.rightBottom)
  const eyeAvg = (left + right) / 2

  const forehead = landmarks[L.forehead]!
  const chin = landmarks[L.chin]!
  const nose = landmarks[L.nose]!
  const faceSpan = chin.y - forehead.y
  const headPitch =
    faceSpan > 1e-5
      ? Math.max(0, Math.min(1, (nose.y - forehead.y) / faceSpan))
      : 0.5

  return 0.65 * eyeAvg + 0.35 * headPitch
}

export function gazeThreshold(cal: PredictiveCalibration): number {
  const span = cal.bottom - cal.top
  return cal.top + 0.65 * span
}

export const DWELL_MS = 1500
export const COOLDOWN_MS = 2500
/** Ventana de muestreo de cada paso de calibración (mirar la zona resaltada). */
export const CALIB_SAMPLE_MS = 4500
