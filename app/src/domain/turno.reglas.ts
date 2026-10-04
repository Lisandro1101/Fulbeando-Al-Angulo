import type { Rol } from './usuario'
import type { EstadoTurno, Turno } from './turno'

export interface Actor {
  uid: string
  rol: Rol
  prediosIds: string[]
}

export const esDuenoDelPredio = (actor: Actor, predioId: string): boolean =>
  actor.rol === 'superadmin' || actor.prediosIds.includes(predioId)

export const esSuperadmin = (actor: Actor): boolean => actor.rol === 'superadmin'

/**
 * Regla 6.1: un turno solo puede solicitarse si esta libre en el momento de
 * la solicitud (el bloqueo de 15 min nace de la solicitud con comprobante).
 */
export const puedeSolicitarTurno = (turno: Turno): boolean =>
  turno.estado === 'disponible' && turno.deletedAt === null

/** El dueno del predio (o superadmin) aprueba / rechaza. */
export const puedeValidarTurno = (actor: Actor, turno: Turno): boolean =>
  turno.estado === 'bloqueado_temporal' && esDuenoDelPredio(actor, turno.predioId)

export const puedeCancelarTurno = (actor: Actor, turno: Turno): boolean => {
  if (turno.estado === 'cancelado') return false
  if (esDuenoDelPredio(actor, turno.predioId)) return true
  return turno.estado === 'confirmado' && turno.organizadorUid === actor.uid
}

/**
 * Regla 6.2: solo un usuario con turno confirmado para ese horario, o el dueno
 * del predio, pueden activar un radar de suplentes.
 */
export const puedeActivarRadar = (actor: Actor, turno: Turno): boolean => {
  if (turno.deletedAt !== null) return false
  if (turno.estado === 'cancelado') return false
  if (esDuenoDelPredio(actor, turno.predioId)) return turno.estado === 'confirmado'
  return turno.estado === 'confirmado' && turno.organizadorUid === actor.uid
}

/** Transiciones validas. Cualquier otra combinacion se rechaza (rules + cliente). */
const TRANSICIONES: Record<EstadoTurno, readonly EstadoTurno[]> = {
  disponible: ['bloqueado_temporal', 'cancelado'],
  bloqueado_temporal: ['confirmado', 'disponible', 'cancelado'],
  confirmado: ['cancelado'],
  cancelado: [],
}

export const transicionValida = (desde: EstadoTurno, hasta: EstadoTurno): boolean =>
  desde === hasta || TRANSICIONES[desde].includes(hasta)
