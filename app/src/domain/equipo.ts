import type { PlayerRole } from './usuario'
import type { GeoIndex, Timestamp } from './comun'

/**
 * Modulo "AL ANGULO": equipos y roles deportivos.
 *
 * Este es el unico lugar donde vive la forma de un equipo. Los nombres de campo
 * en ingles (`captainId`, `members`) se conservan a proposito: son los que leen
 * `firestore.rules` y los que escribe `scripts/seed-emuladores.ts`. Renombrarlos
 * obligaria a migrar rules y seed a cambio de nada funcional.
 */

export type RolEquipo = 'CAPITAN' | 'PLAYER' | 'DT'

/** Miembro embebido en el array `members` del documento de equipo (sin N+1). */
export interface MiembroEquipo {
  uid: string
  name: string
  role: RolEquipo
  /** Dorsal: lo asigna el capitan, opcional hasta que se arma el plantel. */
  dorsal?: number | null
  position?: PlayerRole | null
  avatarUrl?: string | null
}

export interface ReputacionEquipo {
  partidosJugados: number
  buenRivalCount: number
  conflictivoCount: number
  fairPlayScore: number // 0 a 100%
}

export interface ConvocatoriaEquipo {
  fecha: string
  hora?: string | null
  predioId?: string | null
  predioNombre?: string | null
  predio?: string | null
  cancha?: string | null
  canchaNombre?: string | null
  jugadoresFaltantes?: number
  confirmados: string[]
  bajas: string[]
  refuerzos?: Array<{
    uid: string
    nombre: string
    avatarUrl?: string | null
    posicion?: string | null
  }>
  votosMvp?: Record<string, string> // [votanteUid]: candidatoUid
  equipoRivalId?: string | null
  alertaRadarEnviada?: boolean
  alertaRadarId?: string | null
  cerrada?: boolean
}

export interface Equipo {
  id: string
  name: string
  shieldUrl?: string | null
  captainId: string
  /** Modalidad base del equipo. Reusa el vocabulario de canchas del modulo FULBEANDO. */
  modalidadBase: string
  genero?: 'Masculino' | 'Femenino' | 'Mixto'
  members: MiembroEquipo[]
  stats: {
    wins: number
    draws: number
    losses: number
  }
  /**
   * Zona donde juega el equipo. Opcional: los equipos sin `geo` no aparecen en
   * el mapa, pero se siguen managing desde "Mis equipos".
   */
  geo?: GeoIndex | null
  convocatoria?: ConvocatoriaEquipo | null
  ultimoPartido?: {
    fecha: string
    predioNombre?: string | null
    canchaNombre?: string | null
    mvpId?: string | null
    mvpNombre?: string | null
    mvpEmoji?: string | null
    stats?: Record<string, { goles: number; asistencias: number }>
    finalizadoEn: number
  } | null
  estadisticasJugadores?: Record<string, {
    goles: number
    asistencias: number
    partidosJugados: number
    mvpCount: number
  }>
  reputation?: ReputacionEquipo
  createdAt: Timestamp | number
}

/**
 * Maximo de JUGADORES de un equipo, sin contar al organizador.
 *
 * El organizador es quien creo el equipo y lo administra (`captainId` con rol
 * `CAPITAN` en `members`), y va aparte: un equipo completo son 23 fichas.
 */
export const MAX_JUGADORES_EQUIPO = 22

/**
 * Maximo de fichas totales de un equipo: 22 jugadores + 1 organizador.
 *
 * Coincide con `firestore.rules`
 * (`request.resource.data.members.size() <= 23`). Si se cambia el numero aqui,
 * hay que cambiarlo tambien en las rules y en el test de reglas, o el cliente
 * y el servidor van a discrepar.
 */
export const MAX_MEMBROS_EQUIPO = MAX_JUGADORES_EQUIPO + 1

/**
 * Maximo de equipos simultaneos por jugador (contando el propio que creo).
 *
 * Regla de negocio: un jugador puede pertenecer como mucho a 2 equipos a la vez.
 * Se valida en dos lugares a proposito:
 *   - `teamService`, para darle al usuario un error legible;
 *   - `firestore.rules` sobre `usuarios/{uid}`, porque el limite se apoya en
 *     `perfilDeportivo.teamIds`, que es un documento que escribe el CLIENTE.
 *     Sin la regla, un cliente modificado se saltaria el tope.
 */
export const MAX_EQUIPOS_POR_JUGADOR = 2

/** Quantos miembros tiene el equipo sin contar al organizador. */
export const jugadoresDe = (equipo: Equipo): MiembroEquipo[] =>
  equipo.members.filter((m) => m.role !== 'CAPITAN')

export const ETIQUETA_ROL_EQUIPO: Record<RolEquipo, string> = {
  CAPITAN: 'Capitán',
  PLAYER: 'Jugador',
  DT: 'Director técnico',
}

export const esCapitan = (equipo: Equipo, uid: string): boolean => equipo.captainId === uid

export const esMiembro = (equipo: Equipo, uid: string): boolean =>
  equipo.members.some((m) => m.uid === uid)

/** El Puedojugatear en nombre del equipo (capitan o DT). */
export const puedeGestionarEquipo = (equipo: Equipo, uid: string): boolean => {
  if (esCapitan(equipo, uid)) return true
  const miembro = equipo.members.find((m) => m.uid === uid)
  return miembro?.role === 'DT'
}

/** Dorsal libre: los DT pueden repetir dorsal, los jugadores no. */
export const dorsalLibre = (equipo: Equipo, dorsal: number, esDt: boolean): boolean => {
  if (esDt) return true
  return !equipo.members.some((m) => m.dorsal === dorsal && m.role !== 'DT')
}

export interface DivisionEquipoInfo {
  numero: number // 1 a 5 (1 = Primera División, 5 = Promocional)
  nombre: string // "Primera División Élite", "Categoría A", etc.
  nombreCorto: string // "1ra División", "Cat A", etc.
  badgeClass: string // Clases Tailwind para el badge
  icono: string // "🏆", "🥇", "🥈", "⚔️", "🥉"
  puntos: number // Puntos acumulados en liga
  mediaEquipo: number // Media general del plantel (50-99)
  insigniaFairPlay: {
    score: number // 0 a 100%
    texto: string // "Rival Ejemplar", "Rival Confiable", "En Advertencia"
    badgeClass: string
    icono: string
  }
}

/**
 * Calcula la División de Fútbol y Reputación de un equipo.
 * Sistema de 5 Divisiones (1ra División a Promocional) basado en puntos de liga y OVR del plantel.
 */
export const calcularDivisionEquipo = (datos: {
  stats?: { wins: number; draws: number; losses: number } | null
  mediaPlantel?: number | null
  reputation?: ReputacionEquipo | null
}): DivisionEquipoInfo => {
  const wins = datos.stats?.wins || 0
  const draws = datos.stats?.draws || 0
  
  // Puntos de liga tradicional (3 por victoria, 1 por empate)
  const puntosTotales = (wins * 3) + (draws * 1)
  
  // Media del equipo (promedio de los miembros o base 58)
  const mediaEquipo = datos.mediaPlantel && datos.mediaPlantel > 0 ? Math.round(datos.mediaPlantel) : 58

  // Reputación / Fair Play
  const fpScore = datos.reputation?.fairPlayScore ?? 100
  let insigniaFairPlay = {
    score: fpScore,
    texto: 'Rival Ejemplar',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icono: '🤝',
  }

  if (fpScore < 70) {
    insigniaFairPlay = {
      score: fpScore,
      texto: 'En Advertencia',
      badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      icono: '⚠️',
    }
  } else if (fpScore < 88) {
    insigniaFairPlay = {
      score: fpScore,
      texto: 'Rival Confiable',
      badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      icono: '🛡️',
    }
  }

  // 1ra División: >= 50 pts O (>= 25 pts Y media >= 78)
  if (puntosTotales >= 50 || (puntosTotales >= 25 && mediaEquipo >= 78)) {
    return {
      numero: 1,
      nombre: 'Primera División Élite',
      nombreCorto: '1ra División',
      badgeClass: 'bg-gradient-to-r from-amber-500/25 via-yellow-400/20 to-amber-600/25 text-amber-300 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
      icono: '🏆',
      puntos: puntosTotales,
      mediaEquipo,
      insigniaFairPlay,
    }
  }

  // 2da División: Categoría A (>= 30 pts O (>= 15 pts Y media >= 72))
  if (puntosTotales >= 30 || (puntosTotales >= 15 && mediaEquipo >= 72)) {
    return {
      numero: 2,
      nombre: 'Categoría A (Superliga)',
      nombreCorto: 'Categoría A',
      badgeClass: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
      icono: '🥇',
      puntos: puntosTotales,
      mediaEquipo,
      insigniaFairPlay,
    }
  }

  // 3ra División: Categoría B (>= 18 pts O (>= 9 pts Y media >= 66))
  if (puntosTotales >= 18 || (puntosTotales >= 9 && mediaEquipo >= 66)) {
    return {
      numero: 3,
      nombre: 'Categoría B (Nacional)',
      nombreCorto: 'Categoría B',
      badgeClass: 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.25)]',
      icono: '🥈',
      puntos: puntosTotales,
      mediaEquipo,
      insigniaFairPlay,
    }
  }

  // 4ta División: Categoría C (>= 9 pts O (>= 4 pts Y media >= 61))
  if (puntosTotales >= 9 || (puntosTotales >= 4 && mediaEquipo >= 61)) {
    return {
      numero: 4,
      nombre: 'Categoría C (Metropolitana)',
      nombreCorto: 'Categoría C',
      badgeClass: 'bg-zinc-800 text-slate-300 border-slate-600/50',
      icono: '⚔️',
      puntos: puntosTotales,
      mediaEquipo,
      insigniaFairPlay,
    }
  }

  // 5ta División: Regional / Promocional (inicial)
  return {
    numero: 5,
    nombre: 'Liga Promocional Regional',
    nombreCorto: 'Promocional',
    badgeClass: 'bg-amber-950/30 text-amber-400/90 border-amber-700/40',
    icono: '🥉',
    puntos: puntosTotales,
    mediaEquipo,
    insigniaFairPlay,
  }
}