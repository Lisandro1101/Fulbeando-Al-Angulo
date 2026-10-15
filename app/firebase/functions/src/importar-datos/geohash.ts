/**
 * Geohash — copia minima de `app/src/core/geo/geohash.ts` para el paquete de
 * Functions. El paquete de Cloud Functions NO puede importar codigo de `app/`
 * (vive en otro tsconfig/paquete y se despliega por separado), asi que este
 * importador necesita su propia implementacion pura.
 *
 * Si cambia el algoritmo en `app/`, hay que reflejarlo aca: el radar hace
 * `array-contains-any` con los mismos prefijos, y un desajuste deja el mapa
 * vacio aunque los datos esten "bien".
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'

export interface Punto {
  lat: number
  lng: number
}

export interface Bounds {
  latMin: number
  latMax: number
  lngMin: number
  lngMax: number
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))

/** Geohash estandar (base32). Precision 5 ~ celda de 4.9 km. */
export function encodeGeohash(lat: number, lng: number, precision = 9): string {
  if (lat < -90 || lat > 90) throw new RangeError(`lat fuera de rango: ${lat}`)
  let latMin = -90
  let latMax = 90
  let lngMin = -180
  let lngMax = 180
  let hash = ''
  let bits = 0
  let bitCount = 0
  let even = true

  while (hash.length < precision) {
    if (even) {
      const mid = (lngMin + lngMax) / 2
      if (lng >= mid) {
        bits = (bits << 1) | 1
        lngMin = mid
      } else {
        bits <<= 1
        lngMax = mid
      }
    } else {
      const mid = (latMin + latMax) / 2
      if (lat >= mid) {
        bits = (bits << 1) | 1
        latMin = mid
      } else {
        bits <<= 1
        latMax = mid
      }
    }
    even = !even
    if (++bitCount === 5) {
      hash += BASE32[bits] ?? '0'
      bits = 0
      bitCount = 0
    }
  }
  return hash
}

/** Caja que contiene la celda de un geohash. */
export function boundsDeGeohash(hash: string): Bounds {
  let latMin = -90
  let latMax = 90
  let lngMin = -180
  let lngMax = 180
  let even = true

  for (const char of hash) {
    const value = BASE32.indexOf(char)
    if (value < 0) throw new Error(`Geohash invalido: "${hash}"`)
    for (let mask = 16; mask >= 1; mask >>= 1) {
      if (even) {
        const mid = (lngMin + lngMax) / 2
        if (value & mask) lngMin = mid
        else lngMax = mid
      } else {
        const mid = (latMin + latMax) / 2
        if (value & mask) latMin = mid
        else latMax = mid
      }
      even = !even
    }
  }
  return { latMin, latMax, lngMin, lngMax }
}

const KM_POR_GRADO_LAT = 110.574
const EARTH_RADIUS_KM = 6371

/** Distancia en km. Filtro exacto posterior al `array-contains-any`. */
export function haversineKm(a: Punto, b: Punto): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Prefijos de geohash que cubren un radio (km). Si la grilla excede `maxPrefijos`
 * baja la precision para que la query siga siendo valida (Firestore limita
 * `array-contains-any`).
 */
export function prefijosQueCubren(
  punto: Punto,
  radioKm: number,
  precisionInicial = 5,
  maxPrefijos = 10
): string[] {
  const dLat = radioKm / KM_POR_GRADO_LAT
  const cos = Math.cos((punto.lat * Math.PI) / 180)
  const dLng = Math.abs(cos) < 1e-6 ? 180 : radioKm / (KM_POR_GRADO_LAT * cos)

  for (let precision = precisionInicial; precision >= 1; precision -= 1) {
    const celda = boundsDeGeohash(encodeGeohash(punto.lat, punto.lng, precision))
    const alto = celda.latMax - celda.latMin
    const ancho = celda.lngMax - celda.lngMin

    const filas = Math.max(1, Math.ceil((dLat * 2) / alto) + 1)
    const columnas = Math.max(1, Math.ceil((dLng * 2) / ancho) + 1)
    if (filas * columnas > maxPrefijos) continue

    const set = new Set<string>()
    for (let f = 0; f < filas; f += 1) {
      const lat = clamp(punto.lat - dLat + f * alto, -90, 90)
      for (let c = 0; c < columnas; c += 1) {
        const lng = clamp(punto.lng - dLng + c * ancho, -180, 180)
        set.add(encodeGeohash(lat, lng, precision))
      }
    }
    return [...set]
  }

  return [encodeGeohash(punto.lat, punto.lng, 1)]
}

/**
 * Prefijos + todos sus ancestros (1..5 chars) para que el `array-contains-any`
 * del radar haga match exacto. Mismo criterio que `app/src/core/geo/geohash.ts`.
 */
export function prefijosQueCubrenBD(punto: Punto, radioKm: number): string[] {
  const base = prefijosQueCubren(punto, radioKm, 5, 500)
  const set = new Set<string>()
  for (const hash of base) {
    for (let i = 1; i <= hash.length; i++) {
      set.add(hash.substring(0, i))
    }
  }
  return [...set]
}
