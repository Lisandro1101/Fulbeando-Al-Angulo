import type { Timestamp } from './comun'

export type CategoriaReporte = 'abuso' | 'datos_falsos' | 'no_show' | 'otro'
export type EstadoReporte = 'abierto' | 'resuelto' | 'descartado'

/** Moderacion de reportes por parte del superadmin (PRD 2). */
export interface Reporte {
  id: string
  reportanteUid: string
  usuarioReportadoUid: string
  categoria: CategoriaReporte
  motivo: string
  estado: EstadoReporte
  resueltoPor: string | null
  resueltoAt: Timestamp | null
  createdAt: Timestamp
  deletedAt: Timestamp | null
}
