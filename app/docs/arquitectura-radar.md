# Arquitectura del Radar — análisis y plan de evolución

Documento técnico sobre el motor geoespacial del mapa unificado
(predios, equipos, desafíos y jugadores libres). Cubre:

1. Reestructuración de la capa **Predios** para integrarla al geohash.
2. Migración del cómputo de proximidad a una **Cloud Function Gen 2** con payload optimizado.
3. Arquitectura de transición con **Redis** (`GEOADD` / `GEOSEARCH`), manteniendo Firestore como fuente de verdad.
4. Recomendaciones transversales de **código limpio** y **escalabilidad**.
5. **Plan de implementación por fases** con checkpoints de aprobación.

> Estado: **parcialmente implementado**. Fase 1 ✅ (verificada), Fase 2 ✅
> (con flag `radarUsaFunction`, default **false** → comportamiento actual intacto;
> fallback al cliente) y Fase 3 🟡 (caché en instancia y `total` ya dentro de la
> Function). Fase 4 ⏸ sin empezar. Ver el estado por fase en §5.
>
> Desvíos respecto de esta propuesta al implementar la Fase 2: se dejó
> `enforceAppCheck: false` (el cliente aún no inicializa App Check; activarlo lo
> rompería) y la Function **siempre** aplica el filtro geográfico con
> `prefijosQueCubren` (baja la precisión en radios grandes en vez de abandonar el
> filtro). El DTO quedó como unión discriminada por tipo (`t`). El paquete
> `firebase/functions` se subió a `typescript` 5.x (el `^5.0.0` del `package.json`
> no estaba instalado).

---

## 0. Radiografía actual

```
┌──────────────────────────────────────────────────────────────┐
│  Cliente (React + react-leaflet + Leaflet)                    │
│                                                              │
│  MapaRadarUnificado.tsx                                       │
│    ├─ listarPrediosPublicos('')      ──► TODOS los activos   │  ⚠ sin geo
│    ├─ listarDesafiosCercanos(punto,r) ──► geo.prefijos        │
│    ├─ listarCandidatosRadar(punto,r)  ──► geo.prefijos        │
│    └─ listarEquiposCercanos(punto,r)  ──► geo.prefijos        │
│                                                              │
│  Filtro exacto Haversine + sort + slice(100)  ← 100% en cliente│
└───────────────────────────┬──────────────────────────────────┘
                            │ firebase/firestore SDK (directo)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Firestore                                                   │
│   predios     { geo: {lat,lng,prefijo,prefijos[]}, ... }      │
│   challenges  { geo: {...}, estado }                          │
│   teams       { geo: {...} }                                  │
│   usuarios    { geo: {...}, perfilDeportivo.* }               │
│                                                              │
│  Índices compuestos (firestore.indexes.json):                │
│   challenges(estado, geo.prefijos)                           │
│   teams(geo.prefijos)                                        │
│   usuarios(disponibleHoy, notificacionesRadar, estado, prefijos)│
│   ✗ falta el de predios                                      │
└──────────────────────────────────────────────────────────────┘
```

### Hallazgos

| # | Hallazgo | Impacto |
|---|---|---|
| F-a | `listarPrediosPublicos('')` trae **todos** los predios `verificado && activo` y el radio se filtra en cliente (`MapaRadarUnificado.tsx:275,281-296`). | Costo de lecturas O(total). El más frágil a escala. |
| F-b | **Los predios ya guardan `geo` completo** (`repositorio.ts:50`, `EditorPredio.tsx:117` vía `aGeoIndex`). | La migración de Predios es de **bajo riesgo**: solo cambia la query, no el modelo ni los writes. |
| F-c | Todo el cómputo pesado (Haversine + orden) vive en el dispositivo. | Latencia variable, datos de más en la red, lógica no reutilizable. |
| F-d | El geohash está **duplicado** en `app/src/core/geo/geohash.ts` y `firebase/functions/src/importar-datos/geohash.ts`. | Riesgo de desincronización del algoritmo → mapa vacío sin error. |
| F-e | El payload que cruza la red son **documentos completos** (`Predio` incluye `cobro`, `telefono`, `duenoUid`, `canchasResumen`…). | Overfetch y exposición de campos sensibles. |
| F-f | No hay índice compuesto para `predios`. | La query geo de la Fase 1 falla con *"The query requires an index"* hasta crearlo. |

### Lo que ya está bien

- El esquema `geo: { lat, lng, prefijo, prefijos[] }` con ancestros 1..5 (`prefijosQueCubrenBD`) es correcto: permite que una query de **menor precisión** (radios grandes) siga matcheando por `array-contains-any`.
- El patrón `prefijosQueCubren(...) → array-contains-any → Haversine → sort` es el mismo en desafíos/equipos/jugadores: consola la reutilización.

---

## 1. Rediseño de la capa **Predios**

### 1.1 Documento (ya existe; se documenta el contrato)

No hay que cambiar el write `crearPredio` (`repositorio.ts:50`) ni `EditorPredio`
(`:117`): ambos ya aplican `aGeoIndex(punto, appEnv().radarRadioKm)`.

```
predios/{predioId}
{
  id: "caba-palermo-01",
  nombre: "Complejo El Potrero",
  direccion: "Av. Siempreviva 742",
  barrio: "Palermo",
  ciudad: "CABA",
  barrioNormalizado: "palermo",
  geo: {
    lat: -34.5785,
    lng: -58.4215,
    prefijo: "6ez5s",                    // geohash precision 5 (~4.9 km) del predio
    prefijos: ["6","6e","6ez","6ez5","6ez5s", ...] // ancestros 1..5 de las celdas del radio
  },
  telefono: "+54 9 11 ...",
  fotos: ["https://..."],
  cobro: { titular, alias, cbu, montoSena, tipoSena, porcentajeSena },
  duenoUid: "user-dueno-01",
  canchasResumen: [{ id, nombre, tipo, techada, precioHora }],
  franjasBase: [...],
  diasBase: [1,2,3,4,5,6,7],
  verificado: true,
  estado: "activo",
  createdAt, updatedAt, deletedAt: null
}
```

Invariante nueva a respetar: **todo predio deben tener `geo.prefijos` no vacío**
(ver backfill en §1.4).

### 1.2 Query nueva: `listarPrediosCercanos`

Reemplaza a `listarPrediosPublicos('')` en el radar. Mantiene `listarPrediosPublicos`
para usos que de verdad necesitan el padrón completo (admin), pero el mapa deja de usarlo.

```ts
// app/src/modules/predios/repositorio.ts
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { haversineKm, prefijosQueCubren, type Punto } from '@/core/geo/geohash'
import { COLECCIONES } from '@/core/config'
import type { Predio } from '@/domain'

export interface PredioCercano extends Predio {
  distanciaKm: number
}

/** Radio por encima del cual se abandona el filtro geo (coincide con el tope del mapa). */
const RADAR_TOPE_GEO_KM = 50

/**
 * Predios publicos dentro del radio, ya filtrados (Haversine) y ordenados.
 * Usa el mismo motor geoespacial que desafios y equipos: `array-contains-any`
 * sobre `geo.prefijos`, y el radio exacto lo decide `haversineKm`.
 */
export const listarPrediosCercanos = async (
  punto: Punto,
  radioKm: number,
  max = 50,
): Promise<PredioCercano[]> => {
  const col = collection(db, COLECCIONES.predios)
  const esRadioGrande = radioKm > RADAR_TOPE_GEO_KM
  const prefijos = esRadioGrande ? [] : prefijosQueCubren(punto, radioKm, 5)
  if (!esRadioGrande && prefijos.length === 0) return []

  const q = esRadioGrande
    ? query(
        col,
        where('verificado', '==', true),
        where('estado', '==', 'activo'),
        limit(max),
      )
    : query(
        col,
        where('verificado', '==', true),
        where('estado', '==', 'activo'),
        where('geo.prefijos', 'array-contains-any', prefijos),
        limit(max),
      )

  const snap = await getDocs(q)
  return snap.docs
    .map((d) => d.data() as Predio)
    .filter((p) => p.deletedAt === null)
    .map((p) => ({ ...p, distanciaKm: haversineKm(punto, p.geo) }))
    .filter((p) => p.distanciaKm <= radioKm)
    .sort((a, b) => a.distanciaKm - b.distanciaKm)
}
```

Uso en el mapa (`MapaRadarUnificado.tsx`), cambia una línea:

```ts
const [predios, desafios, jugadores, equipos] = await Promise.all([
  listarPrediosCercanos(punto, radioKm).catch((e) => { console.error('Error predios:', e); return [] }),
  listarDesafiosCercanos(punto, radioKm).catch((e) => { console.error('Error desafios:', e); return [] }),
  listarCandidatosRadar(punto, radioKm).catch((e) => { console.error('Error candidatos:', e); return [] }),
  listarEquiposCercanos(punto, radioKm).catch((e) => { console.error('Error equipos:', e); return [] }),
])
```

Y en el mapeo de `canchasEntities`, se usa `p.distanciaKm` en vez de recalcular:

```ts
const canchasEntities: CanchaEntity[] = predios.map((p) => {
  const canchas = canchasDe(p)
  return {
    id: p.id, type: 'cancha' as const,
    lat: p.geo.lat, lng: p.geo.lng,
    distanciaKm: p.distanciaKm,
    nombre: p.nombre,
    tipo: canchas[0]?.tipo ?? 'Sintetico',
    cantidadCanchas: canchas.length,
  }
})
```

### 1.3 Índice compuesto requerido

Agregar a `firebase/firestore.indexes.json`:

```json
{
  "comment": "Radar de predios: verificado+activo + prefijo geoespacial. Sin este indice la query de listarPrediosCercanos falla.",
  "collectionGroup": "predios",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "verificado", "order": "ASCENDING" },
    { "fieldPath": "estado", "order": "ASCENDING" },
    { "fieldPath": "geo.prefijos", "arrayConfig": "CONTAINS" }
  ]
}
```

> Si se conserva el filtro por `barrioNormalizado`, hace falta un **segundo**
> índice con `barrioNormalizado` + `geo.prefijos`. Recomendación: **no** combinar
> barrio con geo en una misma query; que el buscador por barrio siga siendo texto
> y el radar sea geoespacial (responsabilidades separadas).

### 1.4 Backfill de predios existentes

Los predios creados por la UI/seed ya tienen `geo.prefijos`. Para los legacy
(creados antes de `aGeoIndex`, si los hay), un script de una sola vez:

```ts
// scripts/backfill-predios-geo.ts  (ejecutar contra el emulador o prod con admin)
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { aGeoIndex } from '../app/src/core/geo'   // o la copia de functions

const db = getFirestore()
const snap = await db.collection('predios').get()
let n = 0
for (const doc of snap.docs) {
  const p = doc.data()
  if (p.geo?.prefijos?.length && p.geo?.prefijo) continue
  const geo = aGeoIndex({ lat: p.geo.lat, lng: p.geo.lng })
  await doc.ref.update({ geo })
  n++
}
console.log(`Predios backfilled: ${n}`)
```

Verificación previa (contar cuántos faltan):

```js
// consola o script
db.collection('predios').where('geo.prefijos', '==', null).count()  // esperado 0
```

### 1.5 Criterio de aceptación (Fase 1)

- [ ] El mapa pinta los mismos predios que antes **dentro del radio** (no menos).
- [ ] Las lecturas de `predios` por movimiento del mapa caen de O(total) a O(celda).
- [ ] `npm run typecheck` + `npm run build` en verde.
- [ ] Índice desplegado y query sin error de índice.

---

## 2. Cloud Function Gen 2: `radarQuery`

### 2.1 Objetivo

Una sola invocación devuelve **pines ya resueltos** (filtrados, ordenados,
truncados y con solo los campos que el mapa necesita). El cliente deja de
consultar Firestore para el radar y deja de hacer Haversine/sort.

```text
Cliente ──(1 callable)──► radarQuery(lat, lng, radioKm, tipos?)
                              │  Haversine + sort + dedupe + truncar
                              │  lee Firestore con admin SDK (4 colecciones en paralelo)
                              ▼
                          { pins: DTO[], generadoEn, radioKm, total }
Cliente ◄──────────────── lo pinta con Leaflet, sin transformar
```

### 2.2 Beneficios reales (y los que no)

**Sí gana:**
- **Payload mínimo**: ~8 campos por pin en vez del documento completo → menos bytes y menos parsing en el móvil.
- **Una ida y vuelta** en vez de 4 consultas paralelas (menos overhead de red en 4G).
- **Oculta campos sensibles** (`cobro`, `telefono`, `duenoUid`) al cliente.
- **App Check + rate limiting + validación** centralizados (hoy el cliente puede pedir cualquier radio).
- **Cacheable** (ver §2.6): se puede cachear por celda de geohash.

**No gana (importante ser honesto):**
- Las **lecturas de Firestore se facturan igual** (admin SDK o SDK cliente cuestan lo mismo por documento). El ahorro viene de **leer menos documentos** (geohash, §1) y de **transferir menos bytes**, no de "hacerlo en el server".
- Aparece **cold start** de Function y una dependencia más.
- El cómputo Haversine es trivial; moverlo al server **no** es la optimización — la optimización es leer por celda y devolver menos.

### 2.3 Contrato (petición / respuesta)

```ts
// Petición
interface RadarQueryRequest {
  lat: number
  lng: number
  radioKm: number
  tipos?: Array<'cancha' | 'equipo' | 'desafio' | 'jugador'>  // default: todas
  max?: number                                                 // tope duro server-side
}

// Respuesta
interface RadarPin {
  id: string
  t: 'cancha' | 'equipo' | 'desafio' | 'jugador'   // tipo (clave corta = payload chico)
  lat: number
  lng: number
  d: number          // distanciaKm, 1 decimal
  n: string          // nombre/etiqueta visible
  m?: number | string // metrica extra: tipo de cancha, modalidad, etc.
}

interface RadarQueryResponse {
  pins: RadarPin[]
  radioKm: number
  generadoEn: number  // epoch ms
  total: number       // antes de truncar (para UX "hay 240 resultados")
}
```

> Claves cortas (`t`, `d`, `n`, `m`) reducen el JSON ~30-40%. Es un trade-off de
> legibilidad: si preferís DTOs legibles, usá nombres largos y ganá sólo la mitad.

### 2.4 Implementación (Gen 2, reutilizando el geohash del server)

`firebase/functions` ya tiene su copia de `geohash.ts` (F-d). Se **reutiliza** esa
copia (no se importa de `app/`, que es otro paquete/tsconfig).

```ts
// app/firebase/functions/src/radarQuery.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { prefijosQueCubren, haversineKm, type Punto } from './importar-datos/geohash'

const REGION = 'southamerica-east1'
const RADAR_TOPE_GEO_KM = 50
const MAX_PINES = 120

type Tipo = 'cancha' | 'equipo' | 'desafio' | 'jugador'

const COL: Record<Tipo, string> = {
  cancha: 'predios',
  equipo: 'teams',
  desafio: 'challenges',
  jugador: 'usuarios',
}

export const radarQuery = onCall(
  {
    region: REGION,
    enforceAppCheck: true,     // exige token de App Check
    maxInstances: 10,
    concurrency: 80,           // Gen 2: varias requests por instancia
    timeoutSeconds: 15,
    memory: '256MiB',
  },
  async (req) => {
    // 1. Autenticación + validación de entrada
    if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesion.')
    const { lat, lng, radioKm, tipos, max } = req.data ?? {}
    if (typeof lat !== 'number' || typeof lng !== 'number' || typeof radioKm !== 'number') {
      throw new HttpsError('invalid-argument', 'lat/lng/radioKm requeridos.')
    }
    const radio = Math.min(Math.max(radioKm, 1), 500)
    const punto: Punto = { lat, lng }
    const tope = Math.min(max ?? 80, MAX_PINES)
    const pedidos: Tipo[] = (tipos?.length ? tipos : (Object.keys(COL) as Tipo[]))

    // 2. Prefijos geoespaciales (mismos que el cliente usaba)
    const esGrande = radio > RADAR_TOPE_GEO_KM
    const prefijos = esGrande ? [] : prefijosQueCubren(punto, radio, 5)
    if (!esGrande && prefijos.length === 0) {
      return { pins: [], radioKm: radio, generadoEn: Date.now(), total: 0 }
    }

    // 3. Consultas en paralelo, una por coleccion
    const db = getFirestore()
    const consultas = pedidos.map(async (tipo) => {
      const base = db.collection(COL[tipo])
      const q = esGrande
        ? base.where('estado', 'in', ['activo', 'ABIERTO']).limit(tope)
        : base.where('geo.prefijos', 'array-contains-any', prefijos).limit(tope)
      const snap = await q.get()
      return snap.docs.map((d) => ({ tipo, id: d.id, raw: d.data() }))
    })
    const resultados = (await Promise.all(consultas)).flat()

    // 4. Haversine exacto + filtro + DTO + orden + truncar
    const pins = resultados
      .map((r) => {
        const g = r.raw.geo as { lat: number; lng: number } | undefined
        if (!g) return null
        const d = haversineKm(punto, g)
        if (d > radio) return null
        return { id: r.id, t: r.tipo, lat: g.lat, lng: g.lng, d: Math.round(d * 10) / 10, n: '' } as RadarPin
      })
      .filter((p): p is RadarPin => p !== null)
      .sort((a, b) => a.d - b.d)

    const total = pins.length
    return { pins: pins.slice(0, tope), radioKm: radio, generadoEn: Date.now(), total }
  },
)
```

Reexportar en `index.ts`:

```ts
export { radarQuery } from './radarQuery'
```

> **Nota:** el código de arriba es la propuesta original. La implementación
> enviada (`functions/src/radarQuery.ts`) difiere en: `enforceAppCheck: false`,
> **siempre** aplica geo (sin rama `esGrande`), añade caché por instancia y un
> DTO de unión discriminada por tipo. Ver §status al inicio.
>
> El mapeo de etiquetas (`n`) y metadata (`m`) por tipo queda como refactor interno
> (una función `toPin(tipo, raw, distancia)`), para no engordar el handler.

### 2.5 Cliente: llamada + fallback

```ts
// app/src/modules/radar/radarService.ts (nuevo camino)
import { getFunctions, httpsCallable } from 'firebase/functions'
import { functions } from '@/core/firebase'          // región southamerica-east1

export interface RadarPin { id: string; t: string; lat: number; lng: number; d: number; n: string; m?: string | number }

export const consultarRadar = async (
  punto: { lat: number; lng: number },
  radioKm: number,
): Promise<RadarPin[]> => {
  const call = httpsCallable<unknown, { pins: RadarPin[] }>(
    getFunctions(functions.app, 'southamerica-east1'),
    'radarQuery',
  )
  const { data } = await call({ lat: punto.lat, lng: punto.lng, radioKm })
  return data.pins
}
```

**Fallback** (resiliencia): si la Function falla (cold start, cuota, offline),
caer a las 4 consultas directas actuales. Se envuelve detrás de un flag
`appEnv().radarUsaFunction` para poder apagarlo sin deploy.

### 2.6 Optimización de payload y red

1. **DTO compacto** (§2.3): no enviar el documento completo.
2. **Coordenadas ya redondeadas** a 4 decimales (el `aGeoIndex` ya lo hace).
3. **Truncar** server-side (`tope`) + devolver `total` para que la UI diga "hay N".
4. **HTTP/CDN (avanzado, opcional)**: en vez de *callable* (POST, no cacheable), exponer un HTTPS function `GET /radar?gh={geohash:{z}}` con `Cache-Control: public, max-age=30, s-maxage=60`. El CDN de Firebase Hosting cachea por celda → el mismo barrio recibido por muchos usuarios se computa una vez. Requiere que la respuesta no dependa del usuario (es el caso: son datos públicos). **No** aplicar a la capa "jugadores libres" si se decide privacidad estricta.
5. **Evitar round-trips redundantes**: el mapa ya debounce-ea los `moveend`; conservar eso (`MapaRadarUnificado.tsx:356-358`).

### 2.7 Costos y operación

- **Invocaciones**: capa gratuita de Cloud Functions (2M/mes Gen 2) normalmente sobra para el MVP.
- **Firestore**: el ahorro viene de leer por celda, no del server. El `limit(tope)` por colección acota el peor caso.
- **Cold start**: mitigado con `concurrency: 80` y `minInstances: 0` (para no pagar). Si el p95 molesta, subir `minInstances: 1` sólo en horario pico.
- **Observabilidad**: loguear `{ radioKm, prefijos, leidos, devueltos, ms }` para decidir §3 con datos.

### 2.8 Criterio de aceptación (Fase 2)

- [ ] `radarQuery` responde con `pins` y el mapa pinta igual que hoy.
- [ ] Tamaño de respuesta mediano < ~8 KB para radios de barrio.
- [ ] Fallback probado (apagar Function → el mapa sigue funcionando).
- [ ] App Check activo; llamada sin auth → `unauthenticated`.

---

## 3. Transición con Redis (`GEOADD` / `GEOSEARCH`)

### 3.1 Cuándo vale la pena (leelo primero)

Redis **no** es un paso automático. Firestore + geohash aguanta mucho más de lo
que parece. Redis se justifica cuando aparece **alto churn de posiciones en vivo**
(jugadores en movimiento cada N segundos) o **fan-out** de muchos usuarios
consultando la misma zona simultáneamente con latencia sub-100 ms. Para un MVP de
fútbol amateur, lo más probable es que **nunca** lo necesites. Por eso va como
Fase 4 **opcional**, condicionada a métricas.

Disparadores concretos para cruzar el umbral:

| Señal | Umbral sugerido |
|---|---|
| p95 de `radarQuery` | > 400 ms sostenido |
| Lecturas Firestore de `geo.prefijos` | > 30 % del costo mensual |
| Actualizaciones de posición | jugadores moviéndose en vivo (write > 1/s por doc) |
| Usuarios simultáneos en radar | > varios cientos por zona caliente |

### 3.2 Arquitectura

```
                 (fuente de verdad: perfiles, predios, estado)
   ┌─────────────────────────── Firestore ───────────────────────────┐
   │  predios · teams · challenges · usuarios  (con geo.lat/lng)     │
   └───────────┬───────────────────────────────────────▲─────────────┘
               │ onChange triggers (Gen 2)             │ hidratación
               ▼                                        │ de perfiles
   ┌─────────────────────── Redis (Valkey) ─────────────┴─────────────┐
   │  GEO set por tipo:                                                │
   │    geo:cancha   GEOADD <id> lng lat                               │
   │    geo:equipo   GEOADD <id> lng lat                               │
   │    geo:desafio  GEOADD <id> lng lat   (solo ABIERTOS)             │
   │    geo:jugador  GEOADD <id> lng lat   (solo disponibles)          │
   │  (opcional) HASH de cache de perfil: hash:cancha:<id>             │
   └───────────────────────────────┬───────────────────────────────────┘
                                    │ GEOSEARCH FROMLONLAT ... BYRADIUS
                                    ▼
                      radarQuery (Function) → DTO → cliente
```

Flujo de consulta: `GEOSEARCH` → lista de `{id, distancia}` → hidratar perfiles
(desde Redis HASH si está cacheado, si no desde Firestore `getAll` en batch) →
DTO.

### 3.3 Estrategia de sincronización

**Firestore sigue siendo la fuente de verdad.** Redis es un **índice derivado y
reconstruible** en todo momento.

1. **Write-through por triggers** (principal): `onDocumentWritten` en cada
   colección → `GEOADD` (alta/update) o `GEOZREM`/`ZREM` (baja). Gen 2, `concurrency`
   alto.
2. **TTL + lazy rebuild**: si un set se pierde (reinicio/cold), un job de
   reconstrucción lo repuebla desde Firestore. Nada se pierde porque Firestore es la verdad.
3. **Reconciliación periódica** (scheduled, p. ej. cada hora): recalcula el set
   desde Firestore y corrige drift (clave para retener consistencia ante fallos de trigger).
4. **Reglas de negocio en el índice**: sólo indexar estados consultables
   (`desafios` ABIERTOS, `jugadores` disponibles). Un cambio de estado = `ZREM`.

```ts
// app/firebase/functions/src/redisGeo.ts  (bosquejo)
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()                       // UPSTASH_REDIS_REST_URL/TOKEN

const SETS = {
  predios: 'geo:cancha',
  teams: 'geo:equipo',
  challenges: 'geo:desafio',
  usuarios: 'geo:jugador',
} as const

export const syncGeo = onDocumentWritten(
  { document: '{col}/{id}', region: 'southamerica-east1', concurrency: 80 },
  async (event) => {
    const key = SETS[event.params.col as keyof typeof SETS]
    if (!key) return
    const before = event.data?.before?.data()
    const after = event.data?.after?.data()
    const id = event.params.id

    // Baja o dejo de ser visible -> quitar
    if (!after || !esVisible(event.params.col, after)) {
      await redis.zrem(key, id)
      return
    }
    const { lat, lng } = after.geo
    // GEOADD = ZADD al geoset (lng va primero)
    await redis.geoadd(key, { longitude: lng, latitude: lat, member: id })
  },
)
```

Consulta:

```ts
// radarQuery (rama Redis)
const cerca = await redis.geosearch(
  key,
  { type: 'FROMLONLAT', longitude: lng, latitude: lat },
  { type: 'BYRADIUS', radius: radioKm, unit: 'km' },
  { sort: 'ASC', count: tope, withdist: true },
)
// cerca: [{ member: id, dist: n }]  -> hidratar perfiles y armar DTO
```

### 3.4 Pros y contras

**Pros**
- `GEOSEARCH` en O(log N + M): latencia sub-ms, escala a millones de puntos.
- Desacopla lecturas de posición de Firestore → menos lecturas facturadas en la ruta caliente.
- Ideal para **posición en vivo** (jugadores moviéndose) y fan-out de zona.
- Redis es **reconstruible**: perderlo no pierde datos.

**Contras**
- Infra nueva y una **consistencia eventual** que hay que explicar/reintentar.
- **Dos fuentes** para el mismo hecho → más superficie de bugs y de tests.
- Costo/operación: VPC connector (Memorystore) o REST (Upstash); free tiers con límites.
- Si los triggers fallan, hay que **reconciliar** (job periódico obligatorio).
- Overkill para el volumen actual; suma complejidad operativa sin necesidad probada.

### 3.5 Recomendación de proveedor (sesgo "costo cero")

| Opción | Ventaja | Contra | Costo |
|---|---|---|---|
| **Upstash Redis/Valkey** (recomendado) | Serverless HTTP, **sin VPC connector**, free tier ~500K comandos/mes, encaja con Functions | Límite del free tier; latencia HTTP un poco mayor que TCP | **$0** hasta el umbral |
| Cloud Memorystore | TCP, menor latencia, throughput alto | Requiere VPC connector + costo **fijo** mensual | desde ~$X/mes (no cero) |
| **Índice en memoria por instancia** (Fase 3 bis) | **$0**, sin infra nueva | Por-instancia (no compartido), memoria acotada, consistencia por TTL | **$0** |

**Plan costo-cero**: nada de infra extra en Fase 3; si hace falta más, primero el
**índice en memoria por instancia** (0 $, mismo efecto de "calentar" el índice);
sólo si el volumen lo pide, **Upstash free tier**. Memorystore recién si Upstash
queda corto y el negocio lo justifica.

### 3.6 Resiliencia

- Si Redis no responde: **fallback** a la ruta Firestore+geohash (§2). El radar
  nunca se cae por Redis.
- Circuit breaker simple: N fallos en T segundos → usar Firestore por X minutos.
- Los jobs de reconciliación corren aunque los triggers estén caídos.

### 3.7 Criterio de salida (por si se llega)

- [ ] Triggers mantienen los 4 geosets; reconciliación horaria sin drift > 0.
- [ ] `GEOSEARCH` p95 < 50 ms.
- [ ] Kill-switch probado: apagar Redis → el radar sigue sirviendo por Firestore.
- [ ] Costo medido dentro del free tier (o justificado).

---

## 4. Código limpio y escalabilidad (transversal)

1. **Un solo geohash (F-d, el footgun #1).** Opciones:
   - Publicar `geohash.ts` como paquete interno (`packages/geo`) consumido por
     `app` y `functions` (mejor a mediano plazo), **o**
   - mantener la copia y agregar un **test de paridad** que encodee N puntos y
     afirme igualdad entre ambas implementaciones (barato y suficiente).
   *Sin esto, cualquier cambio de algoritmo romperá el mapa en silencio.*

2. **Servicio único de geo.** Extraer `listarCercanos({ coleccion, filtros, punto, radioKm, map })` para que
   desafíos, equipos, jugadores y predios compartan **una** función y no cuatro copias del patrón.

3. **Validación de entrada server-side.** Nunca confiar en `radioKm`/`lat`/`lng` del cliente (hoy el mapa puede pedir hasta 5000 km).

4. **Errores tipados.** `HttpsError` en Functions; `Error` de dominio en el cliente (ya hay `GeohashInvalidoError`, extender a `SinUbicacionError`, etc.).

5. **Observabilidad primero.** Antes de optimizar, medir: contador de lecturas
   por tipo, tamaño de payload, p95. Un `log` estructurado en `radarQuery` habilita §3 con datos, no corazonadas.

6. **Paginación/truncado explícito.** Devolver `total` y `cursor`; la UI decide "cargar más". Hoy el `slice(100)` es silencioso.

7. **No recalcular** distancias ya calculadas por el servicio (el mapa recalcula Haversine sobre predios — ver §1.2).

8. **Constantes geo centralizadas.** `RADAR_RADIO_KM`, `RADAR_TOPE_GEO_KM`, `MAX_PREFIJOS` en un solo módulo, no repartidas entre cliente y server.

---

## 5. Plan de implementación por fases

Cada fase es independiente, con **checkpoint de aprobación** antes de la siguiente.

| Fase | Alcance | Archivos | Riesgo | Aprobación |
|---|---|---|---|---|
| **0. Medir** | Logs estructurados: lecturas por colección, bytes de respuesta, p95 del radar. | `radarService.ts`, `MapaRadarUnificado.tsx` | Ninguno | — |
| **1. Predios al geohash** | `listarPrediosCercanos` + uso en el mapa + índice + backfill. | `predios/repositorio.ts`, `MapaRadarUnificado.tsx`, `firestore.indexes.json`, `scripts/backfill-predios-geo.ts` | Bajo | ✋ |
| **2. Cloud Function Gen 2** | `radarQuery` con App Check, DTO, validación y **fallback** al cliente. | `firebase/functions/src/radarQuery.ts`, `index.ts`, `radarService.ts`, `core/firebase.ts` | Medio | ✋ |
| **3. Payload + cache** | Claves cortas, `max`/`total`, caché en instancia, (opcional) HTTP cacheable. | `radarQuery.ts` | Bajo | ✋ |
| **4. Redis (opcional)** | Triggers `GEOADD`/`ZREM` + `GEOSEARCH` + reconciliación + kill-switch. | `functions/src/redisGeo.ts`, `radarQuery.ts` | Alto | ✋ |

**Orden recomendado:** 0 → 1 (máximo retorno, mínimo riesgo) → 2 → 3 → 4 sólo si 0 y 3 lo justifican.

**Estado actual**

- **Fase 0 🟡** — `radarQuery` emite un log estructurado por llamada
  (`{ fn, radioKm, prefijos, leidos, devueltos, total, ms, cache }`). La medición
  desde el cliente (antes de encender el flag) queda pendiente.
- **Fase 1 ✅** — `listarPrediosCercanos` + geohash + índice + backfill,
  verificados.
- **Fase 2 ✅** — `radarQuery` (Gen 2, `southamerica-east1`) + `consultarRadar`
  en el cliente + flag `VITE_RADAR_USA_FUNCTION` (default `false`) + fallback a
  las consultas directas.
- **Fase 3 🟡** — caché por instancia (TTL 45 s) y `total` ya presentes en la
  Function; el DTO usa unión por tipo. Falta afinar claves cortas/HTTP cacheable.
- **Fase 4 ⏸** — no iniciada (condicionada a métricas).

**Pendiente antes de producción (Fase 2):** inicializar App Check en el cliente y
pasar a `enforceAppCheck: true`; desplegar el índice de `predios`; encender el
flag por entorno cuando se valide la paridad contra las consultas directas.

### Rollback

- Fase 1: revertir el import y la línea del mapa (la query vieja sigue existiendo).
- Fase 2/3: flag `radarUsaFunction=false` → vuelve a la ruta cliente sin redeploy de UI si se lee de `env`.
- Fase 4: kill-switch a Firestore.

---

## 6. Anexo: riesgos y métricas objetivo

| Riesgo | Mitigación |
|---|---|
| Desincronización del geohash entre paquetes (F-d) | Test de paridad / paquete compartido |
| Falla de índice (F-f) → pantalla vacía | Desplegar índice en la misma fase; test en emulador |
| Overfetch / exposición de campos sensibles (F-e) | DTO server-side; nunca devolver `cobro`/`duenoUid` |
| Funciones cold start | `concurrency` alto; `minInstances` sólo en pico |
| Redis como single point of failure | Fallback a Firestore; reconciler; kill-switch |

**Métricas objetivo**

- Latencia del radar: p95 < 300 ms (barrio).
- Lecturas Firestore por carga de mapa: O(celdas) ≈ < 40 docs.
- Payload por carga: < 8 KB.
- Costo del radar: dentro de capas gratuitas hasta el umbral de §3.1.
