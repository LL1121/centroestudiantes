/** Copyright institucional: leer en el servidor (runtime Docker). */
export function getCopyrightEnabled(): boolean {
  const raw =
    process.env.COPYRIGHT_ENABLED ??
    process.env.NEXT_PUBLIC_COPYRIGHT_ENABLED ??
    'false'
  return raw === 'true' || raw === '1'
}
