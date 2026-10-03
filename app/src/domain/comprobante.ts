import type { Timestamp } from './comun'

/**
 * Comprobante de transferencia / sena.
 * Vive en su propia coleccion (`comprobantes/{turnoId}`) y no dentro del turno
 * para que las rules puedan ocultar la imagen a los visitantes.
 * El turno solo expone `comprobantePendiente: boolean`.
 */
export interface Comprobante {
  turnoId: string
  organizerUid: string
  storagePath: string
  mimeType: string
  sizeBytes: number
  /** Snapshot de los datos de cobro del predio al momento de solicitar. */
  alias: string
  monto: number
  subidoAt: Timestamp
  revisadoPor: string | null
  revisadoAt: Timestamp | null
  verificado: boolean
  motivoRechazo: string | null
}

export const storagePathComprobante = (turnoId: string, uid: string, archivo: string): string =>
  `comprobantes/${uid}/${turnoId}/${archivo}`

export const EXTENSIONES_COMPROBANTE = ['jpg', 'jpeg', 'png', 'webp', 'heic'] as const