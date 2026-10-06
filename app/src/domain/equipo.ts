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

export interface Equipo {
  id: string
  name: string
  shieldUrl?: string | null
  captainId: string
  /** Modalidad base del equipo. Reusa el vocabulario de canchas del modulo FULBEANDO. */
  modalidadBase: string
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