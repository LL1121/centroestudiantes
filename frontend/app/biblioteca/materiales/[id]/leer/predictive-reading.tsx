'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  CALIB_SAMPLE_MS,
  clearPredictiveCalibration,
  COOLDOWN_MS,
  computeVerticalGazeScore,
  DWELL_MS,
  gazeThreshold,
  loadPredictivePrefs,
  savePredictiveCalibration,
  type PredictiveCalibration,
} from './predictive-reading-utils'

export type PredictiveStatus =
  | 'idle'
  | 'loading'
  | 'calibrating'
  | 'active'
  | 'paused'
  | 'error'

export type CalibStep = 'top' | 'bottom'

interface Options {
  onNext: () => void
  enabled: boolean
  /** Pausar detección (chat abierto, pestaña oculta, etc.). */
  paused?: boolean
}

interface FaceLandmarkerLike {
  detectForVideo(video: HTMLVideoElement, timestamp: number): {
    faceLandmarks?: Array<Array<{ x: number; y: number; z?: number }>>
  }
  close(): void
}

/** Traduce errores de getUserMedia a mensajes claros para el usuario. */
function describeCameraError(err: unknown): string {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'La cámara necesita una conexión segura (HTTPS). Abrí el sitio por su dirección https://'
  }
  if (err instanceof DOMException) {
    if (err.message === 'insecure') {
      return 'La cámara necesita HTTPS. Abrí el sitio con https:// (o desde el dominio público).'
    }
    if (err.message === 'unsupported') {
      return 'Tu navegador no permite el acceso a la cámara en esta página.'
    }
    switch (err.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return 'Permiso de cámara denegado. Activalo desde el ícono de la barra de direcciones y reintentá.'
      case 'NotFoundError':
      case 'OverconstrainedError':
        return 'No encontramos una cámara disponible en este dispositivo.'
      case 'NotReadableError':
        return 'La cámara está en uso por otra app. Cerrala y volvé a intentar.'
    }
  }
  return 'No pudimos acceder a la cámara. Revisá los permisos del navegador.'
}

export function usePredictiveReading({ onNext, enabled, paused = false }: Options) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const landmarkerRef = useRef<FaceLandmarkerLike | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const dwellStartRef = useRef<number | null>(null)
  const cooldownUntilRef = useRef(0)
  const calibSamplesRef = useRef<number[]>([])
  const calibStartRef = useRef(0)
  const calibTopRef = useRef<number | null>(null)
  const statusRef = useRef<PredictiveStatus>('idle')
  const calibStepRef = useRef<CalibStep | null>(null)
  const capturingRef = useRef(false)
  const captureRafRef = useRef<number>(0)

  const [status, setStatus] = useState<PredictiveStatus>('idle')
  const setStatusBoth = useCallback((s: PredictiveStatus) => {
    statusRef.current = s
    setStatus(s)
  }, [])
  const [calibStep, setCalibStep] = useState<CalibStep | null>(null)
  const setCalibStepBoth = useCallback((s: CalibStep | null) => {
    calibStepRef.current = s
    setCalibStep(s)
  }, [])
  const [calibration, setCalibration] = useState<PredictiveCalibration | null>(
    () => loadPredictivePrefs().calibration,
  )
  const [faceDetected, setFaceDetected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const setCapturingBoth = useCallback((v: boolean) => {
    capturingRef.current = v
    setCapturing(v)
  }, [])
  const [captureProgress, setCaptureProgress] = useState(0)
  const [calibHint, setCalibHint] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    cancelAnimationFrame(captureRafRef.current)
    capturingRef.current = false
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const loadLandmarker = useCallback(async () => {
    const { FilesetResolver, FaceLandmarker } = await import(
      '@mediapipe/tasks-vision'
    )
    const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
    const base = {
      modelAssetPath: '/mediapipe/face_landmarker.task',
    }
    const opts = {
      baseOptions: { ...base, delegate: 'GPU' as const },
      runningMode: 'VIDEO' as const,
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true,
    }
    try {
      return await FaceLandmarker.createFromOptions(vision, opts)
    } catch {
      return FaceLandmarker.createFromOptions(vision, {
        ...opts,
        baseOptions: { ...base, delegate: 'CPU' },
      })
    }
  }, [])

  const startCamera = useCallback(async () => {
    setStatusBoth('loading')
    setError(null)
    try {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new DOMException(
          typeof window !== 'undefined' && !window.isSecureContext
            ? 'insecure'
            : 'unsupported',
          'NotAllowedError',
        )
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) throw new Error('Video no disponible')
      video.srcObject = stream
      await video.play()
      landmarkerRef.current = await loadLandmarker()
      if (calibration) {
        setStatusBoth('active')
      } else {
        setCalibStepBoth('top')
        setStatusBoth('calibrating')
        setCapturingBoth(false)
        setCaptureProgress(0)
        setCalibHint(null)
        calibSamplesRef.current = []
        calibTopRef.current = null
      }
    } catch (err) {
      stopCamera()
      setStatusBoth('error')
      setError(describeCameraError(err))
    }
  }, [
    calibration,
    loadLandmarker,
    stopCamera,
    setCalibStepBoth,
    setStatusBoth,
    setCapturingBoth,
  ])

  const finishCalibStep = useCallback(() => {
    const samples = calibSamplesRef.current
    if (samples.length < 8) {
      // Muy pocas muestras (rostro fuera de cuadro / poca luz): reintentar paso.
      calibSamplesRef.current = []
      setCalibHint('No te detectamos bien. Acomodate y probá de nuevo.')
      return
    }
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length
    const step = calibStepRef.current
    if (step === 'top') {
      calibTopRef.current = avg
      setCalibStepBoth('bottom')
      setCalibHint(null)
      calibSamplesRef.current = []
      return
    }
    if (step === 'bottom' && calibTopRef.current !== null) {
      const final: PredictiveCalibration = {
        top: calibTopRef.current,
        bottom: avg,
      }
      if (final.bottom <= final.top) final.bottom = final.top + 0.1
      savePredictiveCalibration(final)
      setCalibration(final)
      setCalibStepBoth(null)
      setCalibHint(null)
      setStatusBoth('active')
    }
  }, [setCalibStepBoth, setStatusBoth])

  /**
   * Arranca la ventana de captura del paso actual (disparado por el botón).
   * La cuenta regresiva corre con su propio rAF (independiente de la detección)
   * para que nunca se "quede trabada" si la cámara tarda o pierde el rostro.
   */
  const beginCapture = useCallback(() => {
    if (statusRef.current !== 'calibrating') return
    cancelAnimationFrame(captureRafRef.current)
    calibSamplesRef.current = []
    calibStartRef.current = performance.now()
    setCaptureProgress(0)
    setCalibHint(null)
    setCapturingBoth(true)

    const tick = () => {
      const elapsed = performance.now() - calibStartRef.current
      const p = Math.min(1, elapsed / CALIB_SAMPLE_MS)
      setCaptureProgress(p)
      if (p >= 1) {
        setCapturingBoth(false)
        setCaptureProgress(0)
        finishCalibStep()
        return
      }
      captureRafRef.current = requestAnimationFrame(tick)
    }
    captureRafRef.current = requestAnimationFrame(tick)
  }, [setCapturingBoth, finishCalibStep])

  const startCalibration = useCallback(() => {
    setCalibStepBoth('top')
    setStatusBoth('calibrating')
    setCapturingBoth(false)
    setCaptureProgress(0)
    setCalibHint(null)
    calibSamplesRef.current = []
    calibTopRef.current = null
  }, [setCalibStepBoth, setStatusBoth, setCapturingBoth])

  useEffect(() => {
    if (!enabled) {
      stopCamera()
      setStatusBoth('idle')
      return
    }
    void startCamera()
    return () => stopCamera()
  }, [enabled, startCamera, stopCamera, setStatusBoth])

  const calibrationRef = useRef(calibration)
  calibrationRef.current = calibration
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const onNextRef = useRef(onNext)
  onNextRef.current = onNext

  useEffect(() => {
    if (!enabled) return

    let lastTs = 0
    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop)
      if (now - lastTs < 40) return
      lastTs = now

      const st = statusRef.current
      if (st === 'idle' || st === 'loading' || st === 'error') return

      const video = videoRef.current
      const lm = landmarkerRef.current
      if (!video || !lm || video.readyState < 2) return

      // Durante la calibración no pausamos por chat/foco: necesitamos muestrear.
      if (st !== 'calibrating') {
        if (pausedRef.current || document.hidden) {
          if (st === 'active') setStatusBoth('paused')
          dwellStartRef.current = null
          return
        }
        if (st === 'paused') setStatusBoth('active')

        if (now < cooldownUntilRef.current) {
          dwellStartRef.current = null
          return
        }
      }

      let landmarks: Array<{ x: number; y: number; z?: number }> | undefined
      try {
        const result = lm.detectForVideo(video, now)
        landmarks = result.faceLandmarks?.[0]
      } catch {
        return
      }
      const hasFace = !!landmarks && landmarks.length >= 470
      setFaceDetected(hasFace)
      const score = hasFace ? computeVerticalGazeScore(landmarks!) : null

      if (st === 'calibrating') {
        if (capturingRef.current && score !== null) {
          calibSamplesRef.current.push(score)
        }
        return
      }

      if (score === null) {
        dwellStartRef.current = null
        return
      }

      const cal = calibrationRef.current
      if (!cal) return
      const threshold = gazeThreshold(cal)
      if (score >= threshold) {
        if (dwellStartRef.current === null) dwellStartRef.current = now
        if (now - dwellStartRef.current >= DWELL_MS) {
          onNextRef.current()
          cooldownUntilRef.current = now + COOLDOWN_MS
          dwellStartRef.current = null
        }
      } else {
        dwellStartRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [enabled, setStatusBoth])

  const recalibrate = useCallback(() => {
    clearPredictiveCalibration()
    setCalibration(null)
    calibrationRef.current = null
    startCalibration()
  }, [startCalibration])

  return {
    videoRef,
    status,
    calibStep,
    calibration,
    faceDetected,
    error,
    capturing,
    captureProgress,
    calibHint,
    beginCapture,
    startCalibration,
    recalibrate,
    stop: stopCamera,
  }
}
