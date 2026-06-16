/** Worker servido desde /public (mismo origen que la app). */
export const PDF_WORKER_SRC = '/pdf.worker.min.mjs'

type PdfJsApi = {
  GlobalWorkerOptions: { workerSrc: string }
  version: string
}

/** Configura el worker en la instancia pdfjs cargada en cliente (import dinámico). */
export function configurePdfWorkerOn(pdfjsApi: PdfJsApi): void {
  if (typeof window === 'undefined') return
  pdfjsApi.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC
}

/** Opciones de Document; requiere version de la instancia pdfjs del cliente. */
export function pdfDocumentOptions(pdfjsVersion: string) {
  return {
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/standard_fonts/`,
    useSystemFonts: true,
  }
}
