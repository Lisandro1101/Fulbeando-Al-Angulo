import type { Timestamp } from './comun'

/** Tipos de cancha del PRD. */
export type TipoCancha = 'F5' | 'F7' | 'F8' | 'F11'

export const TIPOS_CANCHA: readonly TipoCancha[] = ['F5', 'F7', 'F8', 'F11']

/**
 * Sub-entidad de Predio (coleccion `predios/{predioId}/canchas/{canchaId}`).
 * "Identificador (ej. 'Cancha 1 - Sintetico F5')" segun PRD 3.
 */
export interface Cancha {
  id: string
  predioId: string
  nombre: string
  tipo: TipoCancha
  techada: boolean
  precioHora: number
  activa: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export const etiquetaCancha = (c: Pick<Cancha, 'nombre' | 'tipo' | 'techada'>): string =>
  `${c.nombre} · ${c.tipo}${c.techada ? ' · Techada' : ''}`