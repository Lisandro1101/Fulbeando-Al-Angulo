import type { GeoIndex, Posicion } from './comun'

/**
 * Modulo "AL ANGULO": desafios entre equipos.
 *
 * Comparte con el modulo FULBEANDO el mismo indice geoespacial (`GeoIndex`) y el
 * mismo vocabulario de modalidad, de modo que el mapa unificado consulta canchas,
 * desafios y agentes libres con un solo mecanismo (`core/geo`).
 *
 * PUENTE ENTRE MODULOS: `turnoId` y `predioId` son opcionales. Cuando un equipo
 * ya reservo la cancha (reserva con comprobante de seña del modulo FULBEANDO), el
 * desafio referencia ese turno. Asi el desafio hereda la franja horaria y el
 * lugar ya pagados, y el turno puede mostrar cuantos equipos loancias.
 */

/** Estados del desafio. `ABIERTO` es el unico que aparece en el mapa. */
export type EstadoDesafio = 'ABIERTO' | 'ACEPTADO' | 'CANCELADO' | 'FINALIZADO'

export type ModalidadDesafio = 'F5' | 'F7' | 'F8' | 'F11'

/** Si el equipo ya tiene cancha reservada o busca pagarla a medias. */
export type EstadoCanchaDesafio = 'CON_CANCHA' | 'BUSCA_CANCHA'

export interface Desafio {
  id: string

  /** Quien publica. `firestore.rules` exige que coincida con `auth.uid`. */
  creatorId: string
  equipoId: string
  equipoNombre: string
  equipoEscudoUrl: string | null

  modalidad: ModalidadDesafio
  estadoCancha: EstadoCanchaDesafio
  estado: EstadoDesafio

  /** --- PUENTE CON FULBEANDO (opcionales) --- */
  /** Turno reservado del modulo FULBEANDO, si el equipo ya pago la senia. */
  turnoId: string | null
  /** Predio donde se juega (puede no estar reservado todavia). */
  predioId: string | null
  /** Posicion que busca el rival. `null` = cualquiera. */
  posicionBuscada: Posicion | null

  /** Fecha y hora propuesta (epoch ms). */
  fechaUnix: number

  descripcion: string | null

  /** Mismo formato que Predio / Turno / Alerta: se consulta con `array-contains-any`. */
  geo: GeoIndex

  /** UIDs de los equipos que aceptaron el desafio. */
  equiposAceptantes: string[]
  createdAt: number
}

export const estaAbierto = (d: Desafio, ahoraMs: number): boolean =>
  d.estado === 'ABIERTO' && d.fechaUnix > ahoraMs

/** Un desafio con turno tiene la cancha ya resuelta: el modulo FULBEANDO es la fuente. */
export const tieneCanchaReservada = (d: Desafio): boolean => d.turnoId !== null