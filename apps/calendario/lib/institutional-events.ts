import type { CalendarEvent } from './types'

/**
 * Fechas institucionales del IES N° 9018 de Malargüe y del Centro de Estudiantes.
 * Actualizar manualmente cada ciclo lectivo.
 * Formato de fecha: 'YYYY-MM-DD'
 */
export const INSTITUTIONAL_EVENTS: CalendarEvent[] = [
  // ── Ciclo lectivo 2026 ──────────────────────────────────────────────────
  {
    date: '2026-03-02',
    title: 'Inicio del ciclo lectivo 2026',
    kind: 'institucional',
    description: 'Comienzo de clases para todos los cursos del IES N° 9018.',
  },
  {
    date: '2026-07-13',
    title: 'Inicio del receso invernal',
    kind: 'institucional',
    description: 'Comienzo del receso de invierno.',
  },
  {
    date: '2026-07-27',
    title: 'Fin del receso invernal',
    kind: 'institucional',
    description: 'Regreso a clases tras el receso de invierno.',
  },
  {
    date: '2026-12-18',
    title: 'Último día de clases',
    kind: 'institucional',
    description: 'Cierre del ciclo lectivo 2026.',
  },

  // ── Fechas del Centro de Estudiantes ───────────────────────────────────
  {
    date: '2026-04-10',
    title: 'Asamblea general del Centro de Estudiantes',
    kind: 'centro',
    description: 'Asamblea abierta para todos los estudiantes del IES.',
  },
  {
    date: '2026-09-21',
    title: 'Día del Estudiante',
    kind: 'centro',
    description: 'Festejo anual del Día del Estudiante organizado por el Centro.',
  },
]
