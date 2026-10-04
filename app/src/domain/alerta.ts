import type { Auditoria, GeoIndex, Posicion, Timestamp } from './comun'
import { aMillis } from '@/core/firestore'

/** `expirada` cuando arranca el partido (PRD 3). */
export type EstadoAlerta = 'activa' | 'completada' | 'expirada'
export type PosicionBuscada = Posicion | 'cualquiera'
export type EstadoPostulacion = 'postulado' | 'confirmado' | 'rechazado' | 'retirado'

/**
 * Alerta "Falta 1" (Radar de suplentes por proximidad).
 * Geo denormalizado desde el predio: permite consultar el radar con un solo
 * `array-contains-any` sobre `geo.prefijos` sin leer el predio.
 */
export interface Alerta extends Auditoria {
  id: string
  turnoId: string
  predioId: string
  canchaId: string
  fecha: string
  horaInicio: string
  horaFin: string
  geo: GeoIndex
  /** Por defecto 1 (falta uno), admite mas. */
  cantidadRequeridos: number
  posicionBuscada: PosicionBuscada
  notas: string | null
  creadoPorUid: string
  estado: EstadoAlerta
  confirmados: number
  /** Instante en que la alerta deja de ser util: hora de inicio del partido. */
  expiraEn: Timestamp
}

export const alertaIdDeTurno = (turnoId: string): string => `falta1_${turnoId}`

export const estaActiva = (a: Alerta, ahoraMs: number): boolean => {
  if (a.estado !== 'activa' || a.deletedAt !== null || !a.expiraEn) return false
  const ms = aMillis(a.expiraEn)
  return ms !== null && ms > ahoraMs
}

export const faltanJugadores = (a: Alerta): boolean => a.confirmados < a.cantidadRequeridos

/** Subcoleccion `alertas/{alertaId}/postulaciones/{uid}`. */
export interface Postulacion {
  uid: string
  nombre: string
  posicion: Posicion | null
  estado: EstadoPostulacion
  creadoAt: Timestamp
  actualizadoAt: Timestamp
}
