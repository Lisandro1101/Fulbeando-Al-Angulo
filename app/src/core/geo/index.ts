import type { GeoIndex } from '@/domain'
import { encodeGeohash, prefijosQueCubren } from './geohash'

/** Radio por defecto del radar "Falta 1", en km. */
export const RADAR_RADIO_KM = 5

/**
 * Normaliza a la precision de celda del radar: el resto de los decimales se
 * descarta para no guardar la ubicacion exacta del usuario.
 */
export const aGeoIndex = (
  punto: { lat: number; lng: number },
  radioKm: number = RADAR_RADIO_KM,
): GeoIndex => ({
  lat: Number(punto.lat.toFixed(4)),
  lng: Number(punto.lng.toFixed(4)),
  prefijo: encodeGeohash(punto.lat, punto.lng, 5),
  prefijos: prefijosQueCubren(punto, radioKm, 5),
})