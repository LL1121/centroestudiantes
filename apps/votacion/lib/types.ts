export interface Profesor {
  id: string
  nombre: string
}

export interface LeaderboardEntry {
  profesor_id: string
  nombre: string
  votos: number
  puesto: number
}

export const VOTO_EMITIDO_KEY = 'voto_emitido'
