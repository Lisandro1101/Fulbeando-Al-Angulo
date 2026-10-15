/**
 * Importa `scripts/datos-prueba/datos-prueba.xlsx` en los emuladores de Firebase
 * usando el Admin SDK (no requiere sesion ni pasar por las rules).
 *
 *   npm run datos:generar     # crea el Excel desde data.ts
 *   npm run datos:importar    # lo carga en los emuladores
 *
 * El mapeo y la escritura son EXACTAMENTE los mismos que usa la Cloud Function
 * callable del panel (`importar-datos/mapping.ts` + `importar-datos/importador.ts`),
 * para que script y panel no diverjan.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { PROJECT_ID } from './proyecto-emulador'
import type { Hojas } from '../app/firebase/functions/src/importar-datos/mapping'
import { construirPlan } from '../app/firebase/functions/src/importar-datos/mapping'
import { importarPlan } from '../app/firebase/functions/src/importar-datos/importador'

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
// Lo usa `importador.ts` para inicializar SU copia de firebase-admin (la del
// paquete de Functions), que es distinta de la que podria inicializar este script.
process.env.GCLOUD_PROJECT = PROJECT_ID

const ARCHIVO = resolve(process.cwd(), 'scripts/datos-prueba/datos-prueba.xlsx')

function leerHojas(): Hojas {
  if (!existsSync(ARCHIVO)) {
    throw new Error(
      `No existe ${ARCHIVO}.\n  Generá el Excel primero:  npm run datos:generar`,
    )
  }
  const wb = XLSX.readFile(ARCHIVO)
  const hojas: Hojas = {}
  for (const nombre of wb.SheetNames) {
    const ws = wb.Sheets[nombre]
    if (!ws) continue
    hojas[nombre] = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
  }
  return hojas
}

async function main(): Promise<void> {
  console.log(`📥 Importando ${ARCHIVO} en "${PROJECT_ID}" (emuladores)...\n`)

  const hojas = leerHojas()
  const plan = construirPlan(hojas)
  const resumen = await importarPlan(plan)

  console.log('✅ Importación terminada.')
  console.log(`   usuarios:      ${resumen.usuarios}`)
  console.log(`   solicitudes:   ${resumen.solicitudes}`)
  console.log(`   predios:       ${resumen.predios} (${resumen.canchas} canchas)`)
  console.log(`   equipos:       ${resumen.equipos}`)
  console.log(`   desafios:      ${resumen.desafios}`)
  console.log(`   partidos:      ${resumen.partidos} (+ espejo en 'matches')`)
  console.log(`   postulaciones: ${resumen.postulaciones}`)
  console.log(`   reportes:      ${resumen.reportes}`)
  if (resumen.errores.length > 0) {
    console.log(`\n⚠️  ${resumen.errores.length} errores:`)
    for (const e of resumen.errores) console.log(`     - ${e}`)
  }
  console.log('\n   Cuentas (password: password123):')
  console.log('     superadmin@fulbeando.com   (rol superadmin)')
  console.log('     dueno.templo@fulbeando.com (dueño, plan activo)')
  console.log('     jug01@fulbeando.com        (jugador)')
  console.log('')
  process.exit(0)
}

main().catch((error) => {
  console.error('\n❌ Error al importar:', error)
  process.exit(1)
})
