/**
 * DINÁMICA DE CÁLCULO DE LA MEDIA (OVR / RATING) DE JUGADORES - FULBEANDO
 * 
 * Basada en métricas de rendimiento real de fútbol amateur (escala 50 a 99 estilo FUT).
 * Diseñada para que el progreso sea escalonado, balanceado y exigente (no llega enseguida a 99).
 * 
 * Parámetros configurables:
 * - Base inicial: 62 puntos para un jugador que recién empieza.
 * - Rodaje / Partidos jugados: experiencia con rendimientos decrecientes (Math.sqrt(partidos) * 2.5, máx 10 pts).
 * - Tasa de gol por partido (ponderada por posición):
 *    * DEL: factor 8 (máx 12 pts)
 *    * MED: factor 10 (máx 12 pts)
 *    * DEF: factor 14 (máx 12 pts)
 *    * ARQ: factor 18 (máx 12 pts)
 *    Amortiguada por rodaje (se necesita jugar al menos 3 partidos para desatar el potencial goleador pleno).
 * - Asistencias por partido: factor 8 (máx 8 pts), amortiguada por rodaje.
 * - MVP (Figura de la cancha ⭐): +1.5 pts por cada distinción como MVP (máx 7 pts).
 * 
 * Tope mínimo: 50. Tope máximo: 99.
 */

export interface MetricasRendimientoJugador {
  partidosJugados: number
  goles: number
  asistencias: number
  mvpCount: number
  posicion?: string | null
  fairPlayIndex?: number
}

export const CONFIG_CALCULO_MEDIA = {
  MEDIA_BASE: 62,
  MAX_PUNTOS_RODAJE: 10,
  MAX_PUNTOS_GOLES: 12,
  MAX_PUNTOS_ASISTENCIAS: 8,
  MAX_PUNTOS_MVP: 7,
  MIN_MEDIA: 50,
  MAX_MEDIA: 99,
  PARTIDOS_PARA_POTENCIAL_PLENO: 3,
}

export const calcularMediaJugador = (metricas: MetricasRendimientoJugador): number => {
  const { partidosJugados, goles, asistencias, mvpCount, posicion } = metricas

  if (!partidosJugados || partidosJugados <= 0) {
    return CONFIG_CALCULO_MEDIA.MEDIA_BASE
  }

  // 1. Rodaje / Experiencia progresiva
  const puntosRodaje = Math.min(
    CONFIG_CALCULO_MEDIA.MAX_PUNTOS_RODAJE,
    Math.sqrt(partidosJugados) * 2.5
  )

  // Factor de madurez (0 a 1): evita que meter 3 goles en el primer partido dispare la media de golpe
  const factorMadurez = Math.min(1, partidosJugados / CONFIG_CALCULO_MEDIA.PARTIDOS_PARA_POTENCIAL_PLENO)

  // 2. Goles según posición
  const posUpper = (posicion || 'DEL').toUpperCase()
  let factorGol = 8
  if (posUpper.includes('ARQ') || posUpper.includes('GK') || posUpper.includes('POR')) {
    factorGol = 18
  } else if (posUpper.includes('DEF')) {
    factorGol = 14
  } else if (posUpper.includes('MED') || posUpper.includes('VOL') || posUpper.includes('MID')) {
    factorGol = 10
  }

  const promedioGol = goles / partidosJugados
  const puntosGoles = Math.min(
    CONFIG_CALCULO_MEDIA.MAX_PUNTOS_GOLES,
    promedioGol * factorGol * factorMadurez
  )

  // 3. Asistencias por partido
  const promedioAsist = asistencias / partidosJugados
  const puntosAsistencias = Math.min(
    CONFIG_CALCULO_MEDIA.MAX_PUNTOS_ASISTENCIAS,
    promedioAsist * 8 * factorMadurez
  )

  // 4. Distinciones MVP de la fecha
  const puntosMvp = Math.min(
    CONFIG_CALCULO_MEDIA.MAX_PUNTOS_MVP,
    (mvpCount || 0) * 1.5
  )

  // Cálculo final y redondeo
  const total = CONFIG_CALCULO_MEDIA.MEDIA_BASE + puntosRodaje + puntosGoles + puntosAsistencias + puntosMvp
  const mediaFinal = Math.round(total)

  return Math.max(CONFIG_CALCULO_MEDIA.MIN_MEDIA, Math.min(CONFIG_CALCULO_MEDIA.MAX_MEDIA, mediaFinal))
}
