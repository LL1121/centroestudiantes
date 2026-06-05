import Link from 'next/link'
import { Pencil } from 'lucide-react'

import { bibHref } from '@/lib/biblioteca-path'

interface Props {
  materialId: string
  titulo: string
}

export function EditMaterialLink({ materialId, titulo }: Props) {
  return (
    <Link
      href={bibHref(`/biblioteca/materiales/${materialId}/editar`)}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
      aria-label={`Editar ${titulo}`}
      title="Editar"
    >
      <Pencil className="h-3.5 w-3.5" aria-hidden />
    </Link>
  )
}
