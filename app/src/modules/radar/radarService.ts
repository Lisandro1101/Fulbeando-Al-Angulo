import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { appEnv, COLECCIONES } from '@/core/config'
import { db } from '@/core/firebase'
import { haversineKm, prefijosQueCubren, type Punto } from '@/core/geo/geohash'
import type { Desafio } from '@/domain'

/**
 * MOTOR GEOESPACIAL DE DESAFIOS ("AL ANGULO").
 *
 * Usa el mismo `GeoIndex` y los mismos helpers que el modulo FULBEANDO
 * (`prefijosQueCubren` + `haversineKm`), asi el mapa unificado consulta canchas,
 * desafios y agentes libres con un solo mecanismo. Se descartaron los bounding
 * boxes de geofire y la dependencia `geofire-common`.
 */

export type PinDesafio = Desafio & { distanciaKm: number }

/** Desafios abiertos dentro del radio, ordenados por distancia. */
export const listarDesafiosCercanos = async (
  punto: Punto,
  radioKm: number = appEnv().radarRadioKm,
): Promise<PinDesafio[]> => {
  const prefijos = prefijosQueCubren(punto, radioKm, 5)
  if (prefijos.length === 0) return []

  const snap = await getDocs(
    query(
      collection(db, COLECCIONES.desafios),
      where('geo.prefijos', 'array-contains-any', prefijos),
      where('estado', '==', 'ABIERTO'),
      // Limite duro: frena densidades extremas (100 partidos en 10 cuadras).
      limit(20),
    ),
  )

  return snap.docs
    .map((d) => d.data() as Desafio)
    .map((d) => ({
      ...d,
      // Falso positivo del geohash: el radio exacto lo decide haversine.
      distanciaKm: d.geo ? haversineKm(punto, d.geo) : Number.POSITIVE_INFINITY,
    }))
    .filter((d) => d.distanciaKm <= radioKm)
    .sort((a, b) => a.distanciaKm - b.distanciaKm)
}