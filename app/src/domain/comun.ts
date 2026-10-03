import type { Timestamp } from 'firebase/firestore'

/** Reexport para que el dominio no importe Firebase en cada archivo. */
export type { Timestamp }

/** Auditoria comun. Nunca se hard-deletea: `deletedAt` marca la baja logica. */
export interface Auditoria {
  createdAt: Timestamp
  updatedAt: Timestamp
  deletedAt: Timestamp | null
}

/**
 * Indice geoespacial aproximado (equivalente a PostGIS en el PRD, resuelto
 * con geohash porque Firebase no trae PostGIS).
 * - `prefijo`  : geohash de precision GEOHASH_PRECISION (celda ~4.9 km).
 * - `prefijos` : celdas vecinas que cubren el radio de busqueda del radar.
 *                Consulta con `array-contains-any` + filtro exacto por haversine.
 */
export interface GeoIndex {
  lat: number
  lng: number
  prefijo: string
  prefijos: string[]
}

export type Posicion = 'arquero' | 'defensor' | 'medio' | 'delantero'
export type PiernaHabil = 'diestro' | 'zurdo'
export type NivelAutopercibido = 1 | 2 | 3 | 4 | 5