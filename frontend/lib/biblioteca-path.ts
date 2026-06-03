// Rutas de la biblioteca según el deploy.
//
// El mismo código sirve dos despliegues:
//   - Centro de estudiantes: la biblioteca vive bajo `/biblioteca/...`.
//   - Deploy AISLADO (NEXT_PUBLIC_BIBLIOTECA_ONLY=true): la biblioteca vive en
//     la raíz (`/`, `/login`, `/subir`, ...).
//
// En el código escribimos siempre las rutas canónicas con prefijo `/biblioteca`
// y `bibHref()` las traduce a la ruta pública del deploy. El middleware hace el
// mapeo inverso (raíz -> `/biblioteca/...`) para que la app siga resolviendo.

export const BIBLIOTECA_ONLY = process.env.NEXT_PUBLIC_BIBLIOTECA_ONLY === 'true'

const PREFIX = '/biblioteca'

/** Traduce una ruta canónica (`/biblioteca/...`) a la ruta pública del deploy. */
export function bibHref(path: string): string {
  if (!BIBLIOTECA_ONLY) return path
  if (path === PREFIX) return '/'
  if (path.startsWith(PREFIX + '/')) return path.slice(PREFIX.length)
  if (path.startsWith(PREFIX + '?') || path.startsWith(PREFIX + '#')) {
    return '/' + path.slice(PREFIX.length)
  }
  return path
}
