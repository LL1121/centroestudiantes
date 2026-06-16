import { cn } from '@/lib/utils'

export function MaterialTags({
  tags,
  className,
  onTagClick,
}: {
  tags: string[]
  className?: string
  onTagClick?: (tag: string) => void
}) {
  if (!tags.length) return null

  return (
    <ul className={cn('mt-2 flex flex-wrap gap-1', className)}>
      {tags.map((tag) => (
        <li key={tag}>
          {onTagClick ? (
            <button
              type="button"
              onClick={() => onTagClick(tag)}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/20"
            >
              {tag}
            </button>
          ) : (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {tag}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

export function matchKindLabel(kind: string | null | undefined): string | null {
  if (!kind) return null
  const labels: Record<string, string | null> = {
    title: 'Nombre',
    description: 'Descripción',
    tag: 'Tema',
    carrera: 'Materia',
    semantic: 'Similitud',
    fuzzy: 'Aproximado',
    similar: 'Similar',
    recent: null,
  }
  return labels[kind] ?? kind
}
