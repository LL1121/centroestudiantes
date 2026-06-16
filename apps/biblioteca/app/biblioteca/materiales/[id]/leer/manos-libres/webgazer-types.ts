/** Tipado mínimo de la API de WebGazer que usamos (cargado por <script>). */

export interface GazeData {
  x: number
  y: number
}

export type GazeListener = (data: GazeData | null, elapsedTime: number) => void

export interface WebGazer {
  setRegression(name: 'ridge' | 'weightedRidge' | 'threadedRidge'): WebGazer
  setGazeListener(listener: GazeListener): WebGazer
  begin(): Promise<WebGazer>
  pause(): WebGazer
  resume(): WebGazer
  end(): WebGazer
  clearGazeListener(): WebGazer
  isReady(): boolean
  showVideo(show: boolean): WebGazer
  showFaceOverlay(show: boolean): WebGazer
  showFaceFeedbackBox(show: boolean): WebGazer
  showPredictionPoints(show: boolean): WebGazer
  saveDataAcrossSessions(enabled: boolean): WebGazer
}

declare global {
  interface Window {
    webgazer?: WebGazer
  }
}

const SCRIPT_SRC = '/webgazer/webgazer.js'
const STYLE_ID = 'webgazer-accent-style'
const ACCENT = '#C6A165'

/** Carga el script oficial de WebGazer desde el mismo origen (SSR-safe). */
export function loadWebgazer(): Promise<WebGazer> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('WebGazer no disponible en el servidor'))
  }
  if (window.webgazer) return Promise.resolve(window.webgazer)

  return new Promise<WebGazer>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-webgazer]',
    )
    const onLoad = () => {
      if (window.webgazer) resolve(window.webgazer)
      else reject(new Error('WebGazer cargó pero no expuso la API'))
    }
    if (existing) {
      if (window.webgazer) resolve(window.webgazer)
      else {
        existing.addEventListener('load', onLoad, { once: true })
        existing.addEventListener(
          'error',
          () => reject(new Error('No se pudo cargar WebGazer')),
          { once: true },
        )
      }
      return
    }

    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.dataset.webgazer = 'true'
    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener(
      'error',
      () => reject(new Error('No se pudo cargar WebGazer')),
      { once: true },
    )
    document.head.appendChild(script)
  })
}

/** Inyecta el color de acento (oro/ocre) para los puntos de predicción. */
export function applyGazeDotAccent(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    #webgazerGazeDot {
      background-color: ${ACCENT} !important;
      border: 2px solid ${ACCENT} !important;
      box-shadow: 0 0 10px 2px ${ACCENT}cc !important;
      opacity: 0.85 !important;
      width: 16px !important;
      height: 16px !important;
      z-index: 2147483646 !important;
    }
    #webgazerVideoContainer, #webgazerFaceOverlay, #webgazerFaceFeedbackBox {
      display: none !important;
    }
  `
  document.head.appendChild(style)
}
