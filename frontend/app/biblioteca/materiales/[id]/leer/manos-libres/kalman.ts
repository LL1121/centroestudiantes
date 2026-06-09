/**
 * Filtro de Kalman 1D (modelo de posición con ruido de proceso/medición).
 *
 * Suaviza el temblequeo involuntario del ojo (sacadas oculares) al estabilizar
 * las coordenadas que devuelve WebGazer. Se usa una instancia por eje (X / Y).
 */
export class Kalman1D {
  private readonly r: number
  private readonly q: number
  private readonly a = 1
  private readonly c = 1
  private cov = Number.NaN
  private x = Number.NaN

  /**
   * @param r Ruido de medición (mayor = más suave, más latencia).
   * @param q Ruido de proceso (mayor = sigue más rápido los cambios reales).
   */
  constructor(r = 0.08, q = 3) {
    this.r = r
    this.q = q
  }

  filter(z: number): number {
    if (Number.isNaN(this.x)) {
      this.x = z / this.c
      this.cov = (1 / this.c) * this.r * (1 / this.c)
      return this.x
    }

    const predX = this.a * this.x
    const predCov = this.a * this.cov * this.a + this.q

    const k = (predCov * this.c) / (this.c * predCov * this.c + this.r)
    this.x = predX + k * (z - this.c * predX)
    this.cov = predCov - k * this.c * predCov

    return this.x
  }

  reset(): void {
    this.x = Number.NaN
    this.cov = Number.NaN
  }
}
