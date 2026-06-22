import type { EventKind } from '@/lib/types'

const ITEMS: { kind: EventKind; label: string; colorClass: string }[] = [
  { kind: 'nacional', label: 'Feriado nacional', colorClass: 'bg-red-500' },
  { kind: 'provincial', label: 'Feriado provincial (Mendoza)', colorClass: 'bg-orange-500' },
  { kind: 'institucional', label: 'Fecha institucional (IES)', colorClass: 'bg-primary' },
  { kind: 'centro', label: 'Fecha del Centro de Estudiantes', colorClass: 'bg-emerald-600' },
]

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      {ITEMS.map(({ kind, label, colorClass }) => (
        <span key={kind} className="flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorClass}`} aria-hidden />
          {label}
        </span>
      ))}
    </div>
  )
}
