import {
  boundsDeGeohash,
  encodeGeohash,
  haversineKm,
  prefijosQueCubren,
  MAX_PREFIJOS,
} from '../src/core/geo/geohash'

const ok = (etiqueta: string, condicion: boolean, extra = ''): void => {
  console.log(`${condicion ? 'OK  ' : 'FALLA'} ${etiqueta} ${extra}`)
  if (!condicion) process.exitCode = 1
}

const PALERMO = { lat: -34.5889, lng: -58.43 }

const hash = encodeGeohash(PALERMO.lat, PALERMO.lng, 5)
ok('geohash de 5 chars', hash.length === 5, `(${hash})`)

const celda = boundsDeGeohash(hash)
ok(
  'la celda contiene al punto',
  celda.latMin <= PALERMO.lat && PALERMO.lat <= celda.latMax &&
    celda.lngMin <= PALERMO.lng && PALERMO.lng <= celda.lngMax,
)
const anchoKm = haversineKm(
  { lat: celda.latMin, lng: (celda.lngMin + celda.lngMax) / 2 },
  { lat: celda.latMax, lng: (celda.lngMin + celda.lngMax) / 2 },
)
ok('celda de ~5 km', anchoKm > 2 && anchoKm < 8, `(${anchoKm.toFixed(2)} km)`)

const prefijos = prefijosQueCubren(PALERMO, 5, 5)
ok('cantidad de prefijos dentro del limite', prefijos.length > 0 && prefijos.length <= MAX_PREFIJOS, `(${prefijos.length})`)
ok('incluye la celda propia', prefijos.includes(hash))

const lejano = prefijosQueCubren({ lat: -34.5889, lng: -58.43 }, 5, 5)
ok(
  'puntos cercanos comparten prefijo',
  lejano.some((p) => prefijos.includes(p)),
  `(2.4 km de Palermo entra en la misma celda)`,
)

const lejos = prefijosQueCubren({ lat: -34.9, lng: -58.43 }, 5, 5)
ok('puntos lejanos no comparten celda', !lejos.some((p) => prefijos.includes(p)))

ok('haversine cero consigo mismo', haversineKm(PALERMO, PALERMO) === 0)
const bsAs = { lat: -34.6037, lng: -58.3816 }
const d = haversineKm(PALERMO, bsAs)
ok('haversine en rango', d > 3 && d < 6, `(Palermo -> centro: ${d.toFixed(2)} km)`)

const prefijosRadioGrande = prefijosQueCubren(PALERMO, 50, 5)
ok(
  'radio grande baja precision y respeta el limite',
  prefijosRadioGrande.length <= MAX_PREFIJOS,
  `(50 km -> ${prefijosRadioGrande.length} prefijos, precision ${
    prefijosRadioGrande[0]?.length ?? 0
  })`,
)