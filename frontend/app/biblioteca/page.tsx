import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function BibliotecaHome() {
  redirect('/biblioteca/materiales')
}
