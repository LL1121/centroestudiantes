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

// Bump al reiniciar la votación (TRUNCATE votos) para invalidar flags viejos del browser.
export const VOTO_EMITIDO_KEY = 'voto_emitido_r2'
