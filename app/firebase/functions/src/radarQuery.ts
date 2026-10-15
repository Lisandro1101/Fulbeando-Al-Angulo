import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, type DocumentData } from 'firebase-admin/firestore'
import { prefijosQueCubren, haversineKm, type Punto } from './importar-datos/geohash'

/**
 * RADAR (Fase 2): una sola invocacion devuelve los pines ya resueltos
 * (filtrados por radio, ordenados, truncados y con solo los campos que el mapa
 * necesita). El cliente deja de hacer cuatro consultas y de transformar.
 *
 * Importante (honestidad sobre el ahorro): las lecturas de Firestore cuestan
 * igual desde admin o desde el SDK cliente. El ahorro de esta Function es
 * (a) transferir menos bytes (DTO, no documentos completos), (b) una sola ida y
 * vuelta, (c) ocultar campos sensibles (cobro/telefono/duenoUid) y (d) validar
 * la entrada server-side. Las lecturas bajan por el geohash, no por el server.
 *
 * Se reutiliza la copia del geohash del paquete de Functions
 * (`./importar-datos/geohash`): este paquete NO puede importar de `app/`.
 */

/** Region de despliegue. Debe coincidir con el cliente (`RADAR_FUNCTIONS_REGION`). */
export const RADAR_REGION = 'southamerica-east1'

type Tipo = 'cancha' | 'equipo' | 'desafio' | 'jugador'

/** Mapeo tipo -> coleccion. Igual que `COLECCIONES` del cliente (claves legacy). */
const COL: Record<Tipo, string> = {
  cancha: 'predios',
  equipo: 'teams',
  desafio: 'challenges',
  jugador: 'usuarios',
}

/** Mismo tope por coleccion que las consultas directas del cliente. */
const LIMITES: Record<Tipo, number> = { cancha: 50, equipo: 30, desafio: 20, jugador: 30 }

const MAX_PINES = 120
const RADIO_MAX_KM = 5000
/** TTL de la cache por instancia (Fase 3). Corto: los datos del radar cambian poco. */
const CACHE_TTL_MS = 45_000

/**
 * Pin del radar: union discriminada por `t`. Lleva SOLO lo que el mapa pinta
 * (no el documento entero). El cliente lo mapea 1:1 a su entidad del mapa.
 */
interface PinBase {
  t: Tipo
  id: string
  lat: number
  lng: number
  /** distanciaKm redondeada a 2 decimales. */
  d: number
}
interface PinCancha extends PinBase {
  t: 'cancha'
  nombre: string
  tipo: string
  cantidadCanchas: number
}
interface PinEquipo extends PinBase {
  t: 'equipo'
  nombre: string
  modalidad: string
  cantidadJugadores: number
  escudoUrl: string | null
}
interface PinDesafio extends PinBase {
  t: 'desafio'
  creatorId: string
  equipoId: string | null
  equipo: string
  modalidad: string
  fechaUnix: number
  conCancha: boolean
  descripcion: string | null
}
interface PinJugador extends PinBase {
  t: 'jugador'
  uid: string
  nombre: string
  apellido: string
  playerRole: string | null
  media: number
  fairPlay: number
}

export type RadarPin = PinCancha | PinEquipo | PinDesafio | PinJugador

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback
const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null)

/** Convierte un documento crudo en pin del radar (o `null` si no es visible/esta fuera). */
function aPin(tipo: Tipo, id: string, raw: DocumentData, punto: Punto, radioKm: number): RadarPin | null {
  const geo = raw.geo as { lat?: unknown; lng?: unknown } | undefined
  if (!geo || typeof geo.lat !== 'number' || typeof geo.lng !== 'number') return null

  const d = haversineKm(punto, { lat: geo.lat, lng: geo.lng })
  if (d > radioKm) return null
  const base = { id, lat: geo.lat, lng: geo.lng, d: Math.round(d * 100) / 100 }

  switch (tipo) {
    case 'cancha': {
      if (raw.deletedAt) return null
      const canchas: unknown[] = Array.isArray(raw.canchasResumen) ? raw.canchasResumen : []
      const primera = canchas[0] as DocumentData | undefined
      return {
        ...base,
        t: 'cancha',
        nombre: str(raw.nombre),
        direccion: str(raw.direccion),
        barrio: str(raw.barrio),
        ciudad: str(raw.ciudad),
        telefono: str(raw.telefono),
        tipo: str(primera?.tipo) || 'Sintetico',
        cantidadCanchas: canchas.length,
      }
    }
    case 'equipo': {
      const members: unknown[] = Array.isArray(raw.members) ? raw.members : []
      return {
        ...base,
        t: 'equipo',
        nombre: str(raw.name),
        modalidad: str(raw.modalidadBase),
        cantidadJugadores: members.length,
        escudoUrl: strOrNull(raw.shieldUrl),
      }
    }
    case 'desafio': {
      return {
        ...base,
        t: 'desafio',
        creatorId: str(raw.creatorId),
        equipoId: strOrNull(raw.equipoId),
        equipo: str(raw.equipoNombre),
        modalidad: str(raw.modalidad),
        fechaUnix: num(raw.fechaUnix),
        conCancha: raw.turnoId != null,
        descripcion: strOrNull(raw.descripcion),
      }
    }
    case 'jugador': {
      if (raw.rol !== 'jugador' || raw.deletedAt) return null
      const perfil = (raw.perfilDeportivo ?? {}) as DocumentData
      const stats = (perfil.stats ?? {}) as DocumentData
      return {
        ...base,
        t: 'jugador',
        uid: id,
        nombre: str(raw.nombre),
        apellido: str(raw.apellido),
        playerRole: strOrNull(perfil.playerRole),
        media: num(perfil.rating, 5),
        fairPlay: Math.round(num(stats.fairPlayIndex, 100)),
      }
    }
  }
}

/** Cache por instancia (Fase 3): evita recomputar la misma celda/radio por TTL. */
interface EntradaCache {
  pins: RadarPin[]
  total: number
  expira: number
}
const cache = new Map<string, EntradaCache>()
const claveCache = (punto: Punto, radioKm: number, tipos: Tipo[]): string =>
  `${punto.lat.toFixed(3)}:${punto.lng.toFixed(3)}:${Math.round(radioKm)}:${[...tipos].sort().join('')}`

/**
 * `radarQuery`: pines del radar alrededor de un punto.
 *
 * - Valida y acota la entrada (el cliente NO decide el radio real).
 * - Consulta las 4 colecciones en paralelo con el mismo filtro geohash que
 *   antes vivia en el cliente (`array-contains-any` sobre `geo.prefijos`).
 * - Aplica Haversine exacto, ordena, trunca y devuelve `total` (para UX).
 *
 * App Check: queda DESACTIVADO a proposito porque el cliente todavia no lo
 * inicializa (`initializeAppCheck`). Activarlo antes de configurarlo romperia
 * todas las llamadas. TODO: inicializar App Check y pasar a `enforceAppCheck: true`.
 */
export const radarQuery = onCall(
  {
    region: RADAR_REGION,
    maxInstances: 10,
    concurrency: 80,
    timeoutSeconds: 15,
    memory: '256MiB',
    enforceAppCheck: false,
  },
  async (req) => {
    const t0 = Date.now()
    if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesion para usar el radar.')

    const data = (req.data ?? {}) as Record<string, unknown>
    const lat = Number(data.lat)
    const lng = Number(data.lng)
    const radioRaw = Number(data.radioKm)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radioRaw)) {
      throw new HttpsError('invalid-argument', 'lat/lng/radioKm son obligatorios.')
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new HttpsError('invalid-argument', 'Coordenadas fuera de rango.')
    }

    const radioKm = Math.min(Math.max(radioRaw, 1), RADIO_MAX_KM)
    const punto: Punto = { lat, lng }
    const pedidos: Tipo[] = Array.isArray(data.tipos) && data.tipos.length > 0
      ? (data.tipos as unknown[]).filter((t): t is Tipo => typeof t === 'string' && t in COL)
      : (Object.keys(COL) as Tipo[])
    const tope = Math.min(Number(data.max) || 80, MAX_PINES)

    // `prefijosQueCubren` baja la precision sola para no pasar el tope de
    // `array-contains-any` (<= 30): radios grandes terminan en celdas mas
    // gruesas en vez de abandonar el filtro geografico.
    const prefijos = prefijosQueCubren(punto, radioKm, 5, 10)
    if (prefijos.length === 0) {
      return { pins: [], radioKm, generadoEn: Date.now(), total: 0 }
    }

    const ahora = Date.now()
    const key = claveCache(punto, radioKm, pedidos)
    const enCache = cache.get(key)
    if (enCache && enCache.expira > ahora) {
      registrar({ radioKm, prefijos: prefijos.length, leidos: 0, devueltos: tope, total: enCache.total, ms: ahora - t0, cache: true })
      return { pins: enCache.pins.slice(0, tope), radioKm, generadoEn: ahora, total: enCache.total }
    }

    const db = getFirestore()
    let leidos = 0
    const resultados = (
      await Promise.all(
        pedidos.map(async (tipo) => {
          let q = db.collection(COL[tipo]).where('geo.prefijos', 'array-contains-any', prefijos)
          if (tipo === 'cancha') q = q.where('verificado', '==', true).where('estado', '==', 'activo')
          if (tipo === 'desafio') q = q.where('estado', '==', 'ABIERTO')
          if (tipo === 'jugador') {
            q = q
              .where('estado', '==', 'activo')
              .where('perfilDeportivo.disponibleHoy', '==', true)
              .where('perfilDeportivo.notificacionesRadar', '==', true)
          }
          const snap = await q.limit(LIMITES[tipo]).get()
          leidos += snap.size
          return snap.docs.map((d) => ({ tipo, id: d.id, raw: d.data() }))
        }),
      )
    ).flat()

    const pins = resultados
      .map((r) => aPin(r.tipo, r.id, r.raw, punto, radioKm))
      .filter((p): p is RadarPin => p !== null)
      .sort((a, b) => a.d - b.d)

    const total = pins.length
    const recortados = pins.slice(0, MAX_PINES)
    cache.set(key, { pins: recortados, total, expira: ahora + CACHE_TTL_MS })

    registrar({ radioKm, prefijos: prefijos.length, leidos, devueltos: recortados.length, total, ms: Date.now() - t0, cache: false })

    return { pins: recortados.slice(0, tope), radioKm, generadoEn: Date.now(), total }
  },
)

/** Log estructurado (Fase 0): habilita decidir Fase 4 (Redis) con datos. */
function registrar(metricas: {
  radioKm: number
  prefijos: number
  leidos: number
  devueltos: number
  total: number
  ms: number
  cache: boolean
}): void {
  console.log(JSON.stringify({ fn: 'radarQuery', ...metricas }))
}
