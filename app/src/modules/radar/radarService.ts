import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { appEnv, COLECCIONES } from '@/core/config'
import { db, functionsRegionales } from '@/core/firebase'
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
  const esRadioGrande = radioKm > 50
  const prefijos = esRadioGrande ? [] : prefijosQueCubren(punto, radioKm, 5)
  if (!esRadioGrande && prefijos.length === 0) return []

  const q = esRadioGrande
    ? query(
        collection(db, COLECCIONES.desafios),
        where('estado', '==', 'ABIERTO'),
        limit(50)
      )
    : query(
        collection(db, COLECCIONES.desafios),
        where('geo.prefijos', 'array-contains-any', prefijos),
        where('estado', '==', 'ABIERTO'),
        limit(20)
      )

  const snap = await getDocs(q)

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

/**
 * FASE 2: radar servido por la Cloud Function `radarQuery`.
 *
 * El servidor aplica el MISMO geohash + Haversine que las consultas directas,
 * pero devuelve un pin corto (no el documento completo) y una sola respuesta.
 * El DTO es intencionalmente laxo (`t` discrimina) y el mapa lo mapea a su
 * entidad. El contrato de campos depende de `functions/src/radarQuery.ts`.
 */
export type RadarPinTipo = 'cancha' | 'equipo' | 'desafio' | 'jugador'

interface RadarPinBase {
  t: RadarPinTipo
  id: string
  lat: number
  lng: number
  /** distanciaKm ya calculada en el server. */
  d: number
}
export interface RadarPinCancha extends RadarPinBase {
  t: 'cancha'
  nombre: string
  telefono?: string
  tipo: string
  cantidadCanchas: number
}
export interface RadarPinEquipo extends RadarPinBase {
  t: 'equipo'
  nombre: string
  modalidad: string
  cantidadJugadores: number
  escudoUrl: string | null
}
export interface RadarPinDesafio extends RadarPinBase {
  t: 'desafio'
  creatorId: string
  equipoId: string | null
  equipo: string
  modalidad: string
  fechaUnix: number
  conCancha: boolean
  descripcion: string | null
}
export interface RadarPinJugador extends RadarPinBase {
  t: 'jugador'
  uid: string
  nombre: string
  apellido: string
  playerRole: string | null
  media: number
  fairPlay: number
}
export type RadarPin = RadarPinCancha | RadarPinEquipo | RadarPinDesafio | RadarPinJugador

export interface RespuestaRadar {
  pins: RadarPin[]
  radioKm: number
  generadoEn: number
  /** Total de pines dentro del radio (antes de truncar al tope de respuesta). */
  total: number
}

const radarQueryCallable = httpsCallable<
  { lat: number; lng: number; radioKm: number; tipos?: RadarPinTipo[]; max?: number },
  RespuestaRadar
>(functionsRegionales, 'radarQuery')

/** Llama a `radarQuery`. Lanza si la Function falla (el llamador decide el fallback). */
export const consultarRadar = async (
  punto: Punto,
  radioKm: number,
  tipos?: RadarPinTipo[],
): Promise<RespuestaRadar> => {
  const { data } = await radarQueryCallable({ lat: punto.lat, lng: punto.lng, radioKm, tipos })
  return data
}