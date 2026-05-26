import { pdfjs } from 'react-pdf'

/** Worker servido desde /public (mismo origen que la app). */
export const PDF_WORKER_SRC = '/pdf.worker.min.mjs'

let configured = false

/** Worker PDF.js servido desde /public (mismo origen). Llamar una vez en cliente. */
export function configurePdfWorker(): void {
  if (configured || typeof window === 'undefined') return
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC
  configured = true
}

/** Misma config pero en la instancia pdfjs del import dinámico de react-pdf. */
export function configurePdfWorkerOn(
  pdfjsApi: { GlobalWorkerOptions: { workerSrc: string } },
): void {
  if (typeof window === 'undefined') return
  pdfjsApi.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC
}

/** Opciones de Document para fuentes CJK; cmaps desde unpkg (solo fetch, no worker). */
export function pdfDocumentOptions() {
  const version = pdfjs.version
  return {
    cMapUrl: `https://unpkg.com/pdfjs-dist@${version}/cmaps/`,
    cMapPacked: true,
  }
}
