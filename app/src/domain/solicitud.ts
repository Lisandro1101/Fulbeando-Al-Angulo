import type { Auditoria, Timestamp } from './comun'
import type { TipoCancha } from './cancha'

export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada'

/**
 * Autodesdeclaracion de dueno de predio (rol pendiente de verificacion).
 *
 * El usuario NO se autoasigna `rol: 'dueno_predio'`: sigue siendo `jugador`
 * hasta que el superadmin aprueba. Asi la regla de "solo los duenos dan de
 * alta canchas" no depende de la buena fe de quien se registra.
 */
export interface SolicitudDueno extends Auditoria {
  /** Es tambien el ID del documento: una solicitud viva por usuario. */
  uid: string
  nombre: string
  apellido: string
  telefono: string
  email: string
  nombrePredio: string
  ciudad: string
  barrio: string
  tipoCancha: TipoCancha
  cantidadCanchas: number
  /** Como conoce el complejo / por que lo publica. */
  mensaje: string
  estado: EstadoSolicitud
  revisadoPor: string | null
  revisadoAt: Timestamp | null
  motivoRechazo: string | null
}

export type EstadoSolicitudSeguro = Extract<EstadoSolicitud, 'pendiente' | 'rechazada'>

/** Estados en los que el usuario todavia puede tocar su propia solicitud. */
export const editablePorUsuario = (s: Pick<SolicitudDueno, 'estado'>): boolean =>
  s.estado === 'pendiente' || s.estado === 'rechazada'

export const mensajeDeEstado = (s: Pick<SolicitudDueno, 'estado' | 'motivoRechazo'>): string => {
  switch (s.estado) {
    case 'aprobada':
      return 'Aprobada. Ya podes cargar tus canchas y abrir la grilla.'
    case 'rechazada':
      return s.motivoRechazo
        ? `No fue aprobada: ${s.motivoRechazo}`
        : 'No fue aprobada. Podes completar los datos y volver a enviarla.'
    default:
      return 'En revision. Te avisamos cuando la aprueben.'
  }
}
