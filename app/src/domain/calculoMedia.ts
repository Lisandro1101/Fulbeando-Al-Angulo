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
  MEDIA_BASE: 55, // Base amateur inicial
  MAX_PUNTOS_RODAJE: 12, // Se desbloquea con mucha constancia de partidos
  MAX_PUNTOS_GOLES: 14,
  MAX_PUNTOS_ASISTENCIAS: 10,
  MAX_PUNTOS_MVP: 8,
  MIN_MEDIA: 50,
  MAX_MEDIA: 99,
  PARTIDOS_PARA_POTENCIAL_PLENO: 15, // Requiere al menos 15 partidos para madurar los promedios
}

export const calcularMediaJugador = (metricas: MetricasRendimientoJugador): number => {
  const { partidosJugados, goles, asistencias, mvpCount, posicion } = metricas

  if (!partidosJugados || partidosJugados <= 0) {
    return CONFIG_CALCULO_MEDIA.MEDIA_BASE
  }

  // 1. Rodaje / Experiencia progresiva lenta (crecimiento logarítmico exigente)
  // Con 10 partidos suma ~3.8 pts, con 25 partidos suma ~6 pts, con 60+ partidos suma 9-11 pts.
  const puntosRodaje = Math.min(
    CONFIG_CALCULO_MEDIA.MAX_PUNTOS_RODAJE,
    Math.sqrt(partidosJugados) * 1.2
  )

  // Factor de madurez (0 a 1): exige rodaje sostenido para que los promedios de gol pesen
  const factorMadurez = Math.min(1, partidosJugados / CONFIG_CALCULO_MEDIA.PARTIDOS_PARA_POTENCIAL_PLENO)

  // 2. Goles según posición con amortiguación
  const posUpper = (posicion || 'DEL').toUpperCase()
  let factorGol = 6
  if (posUpper.includes('ARQ') || posUpper.includes('GK') || posUpper.includes('POR')) {
    factorGol = 15
  } else if (posUpper.includes('DEF')) {
    factorGol = 11
  } else if (posUpper.includes('MED') || posUpper.includes('VOL') || posUpper.includes('MID')) {
    factorGol = 8
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
    promedioAsist * 5 * factorMadurez
  )

  // 4. Distinciones MVP de la fecha (0.75 pts por MVP, suma muy gradual)
  const puntosMvp = Math.min(
    CONFIG_CALCULO_MEDIA.MAX_PUNTOS_MVP,
    (mvpCount || 0) * 0.75
  )

  // Cálculo final y redondeo estricto
  const total = CONFIG_CALCULO_MEDIA.MEDIA_BASE + puntosRodaje + puntosGoles + puntosAsistencias + puntosMvp
  const mediaFinal = Math.round(total)

  return Math.max(CONFIG_CALCULO_MEDIA.MIN_MEDIA, Math.min(CONFIG_CALCULO_MEDIA.MAX_MEDIA, mediaFinal))
}
