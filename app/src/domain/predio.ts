import type { Auditoria, GeoIndex } from './comun'
import type { TipoCancha } from './cancha'

export type EstadoPredio = 'activo' | 'inactivo'

/**
 * Datos de cobro. El MVP NO procesa dinero: solo se visualizan para que el
 * organizador transfiera y suba el comprobante (regla de negocio 6.5).
 */
export interface DatosDeCobro {
  titular: string
  alias: string
  cbu: string | null
  montoSena: number
}

/** Cancha resumida, embebida en el predio para pintar el mapa en una sola query. */
export interface CanchaResumen {
  id: string
  nombre: string
  tipo: TipoCancha
  techada: boolean
  precioHora: number
}

export interface Predio extends Auditoria {
  id: string
  nombre: string
  direccion: string
  barrio: string
  ciudad: string
  /** Normalizado en minusculas y sin acentos: alimenta la busqueda por zona. */
  barrioNormalizado: string
  geo: GeoIndex
  telefono: string
  fotos: string[]
  cobro: DatosDeCobro
  duenoUid: string
  /** Copia de solo lectura de las canchas activas (ver `sincronizarResumenCanchas`). */
  canchasResumen: CanchaResumen[]
  verificado: boolean
  estado: EstadoPredio
}

/** Solo los predios verificados y activos son visibles publicamente. */
export const esPublico = (p: Pick<Predio, 'verificado' | 'estado' | 'deletedAt'>): boolean =>
  p.verificado && p.estado === 'activo' && p.deletedAt === null

/** `canchasResumen` se agrega despues del primer seed: tolera documentos viejos. */
export const canchasDe = (p: Pick<Predio, 'canchasResumen'>): CanchaResumen[] =>
  p.canchasResumen ?? []
