/**
 * Backfill de `geo` en `predios` — Fase 1 del plan del radar.
 *
 * Los predios creados por la app (`predios/repositorio.ts` → `aGeoIndex`) ya
 * traen `geo: { lat, lng, prefijo, prefijos[] }`. Este script rellena los
 * documentos LEGACY que quedaron sin `prefijo`/`prefijos` (de antes de que el
 * radar consultara por geohash). Sin esto, esos predios no aparecen en el mapa:
 * la query nueva hace `array-contains-any` sobre `geo.prefijos`.
 *
 * Usa el MISMO geohash que la app/seeder, para no desincronizar los prefijos.
 *
 * Uso:
 *   tsx scripts/backfill-predios-geo.ts --emulador --dry-run   # ver que haria
 *   tsx scripts/backfill-predios-geo.ts --emulador             # emulador local
 *   tsx scripts/backfill-predios-geo.ts                        # produccion (ADC)
 *
 * Flags:
 *   --emulador   apunta a 127.0.0.1:8080 (default si FIRESTORE_EMULATOR_HOST ya existe)
 *   --dry-run    solo reporta, no escribe
 *
 * Radio de cobertura configurable con RADAR_RADIO_KM (default 5, igual que la app).
 */
import * as admin from 'firebase-admin'
import { PROJECT_ID, projectIdDeProduccion } from './proyecto-emulador'
import { encodeGeohash, prefijosQueCubrenBD } from '../app/src/core/geo/geohash'

const EMULADOR = process.argv.includes('--emulador') || !!process.env.FIRESTORE_EMULATOR_HOST
const DRY_RUN = process.argv.includes('--dry-run')
const RADIO_KM = Number(process.env.RADAR_RADIO_KM ?? '5')

if (EMULADOR) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
}

// En emulador el projectId es el de desarrollo; en prod, el real (o ADC si no hay).
const projectId = EMULADOR ? PROJECT_ID : projectIdDeProduccion() ?? undefined
admin.initializeApp(projectId ? { projectId } : undefined)

const db = admin.firestore()

/** Espejo de `core/geo/index.ts` → `aGeoIndex`. Mismo criterio que el seeder. */
const geoDe = (lat: number, lng: number, radioKm: number) => ({
  lat: Number(lat.toFixed(4)),
  lng: Number(lng.toFixed(4)),
  prefijo: encodeGeohash(lat, lng, 5),
  prefijos: prefijosQueCubrenBD({ lat, lng }, radioKm),
})

const tienGeo = (geo: unknown): boolean => {
  const g = geo as { prefijo?: unknown; prefijos?: unknown } | undefined
  return (
    typeof g?.prefijo === 'string' &&
    g.prefijo.length > 0 &&
    Array.isArray(g.prefijos) &&
    g.prefijos.length > 0
  )
}

const main = async (): Promise<void> => {
  console.log(
    `\n  Backfill predios.geo -> ${EMULADOR ? `EMULADOR (${projectId})` : `PRODUCCION (${projectId ?? 'ADC'})`}` +
      `${DRY_RUN ? '  [DRY RUN]' : ''}\n  radio de cobertura: ${RADIO_KM} km\n`,
  )

  const snap = await db.collection('predios').get()
  let revisados = 0
  let faltantes = 0
  let actualizados = 0
  let sinPunto = 0

  for (const doc of snap.docs) {
    revisados += 1
    const p = doc.data()
    if (tienGeo(p.geo)) continue

    const lat = (p.geo as { lat?: unknown } | undefined)?.lat
    const lng = (p.geo as { lng?: unknown } | undefined)?.lng
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      sinPunto += 1
      console.warn(`  [skip] ${doc.id}: sin lat/lng, no se puede indexar`)
      continue
    }

    faltantes += 1
    const geo = geoDe(lat, lng, RADIO_KM)

    if (DRY_RUN) {
      console.log(`  [dry] ${doc.id} -> prefijo ${geo.prefijo} (${geo.prefijos.length} prefijos)`)
      continue
    }

    await doc.ref.update({ geo })
    actualizados += 1
  }

  console.log(
    `\n  Resumen:` +
      `\n    revisados .... ${revisados}` +
      `\n    faltantes .... ${faltantes}` +
      `\n    ${DRY_RUN ? 'a actualizar .' : 'actualizados .'} ${DRY_RUN ? faltantes : actualizados}` +
      `\n    sin lat/lng .. ${sinPunto}\n`,
  )
}

main().catch((e) => {
  console.error(`\n  Error en el backfill: ${(e as Error).message}\n`)
  process.exitCode = 1
})
