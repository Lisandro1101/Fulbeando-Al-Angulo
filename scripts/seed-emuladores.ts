/**
 * ============================================================================
 * SEED DE EMULADORES UNIFICADO — "AL ÁNGULO / FULBEANDO" (Zona Sur)
 * ============================================================================
 * Fuente única de verdad compartida con el importador del panel superadmin.
 * Carga usuarios (+500 de Zona Sur), predios, canchas, turnos, equipos,
 * desafíos, partidos y postulaciones automáticamente al iniciar emuladores.
 *
 * Contraseña universal: password123
 */

import * as admin from 'firebase-admin'
import { PROJECT_ID } from './proyecto-emulador'
import { encodeGeohash, prefijosQueCubrenBD } from '../app/src/core/geo/geohash'
import { construirHojas } from './datos-prueba/data'
import type { Hojas } from '../app/firebase/functions/src/importar-datos/mapping'
import { construirPlan } from '../app/firebase/functions/src/importar-datos/mapping'
import { importarPlan } from '../app/firebase/functions/src/importar-datos/importador'

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
process.env.GCLOUD_PROJECT = PROJECT_ID

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: PROJECT_ID })
}

const db = admin.firestore()
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp()

const geo = (lat: number, lng: number, radioKm = 5) => ({
  lat: Number(lat.toFixed(4)),
  lng: Number(lng.toFixed(4)),
  prefijo: encodeGeohash(lat, lng, 5),
  prefijos: prefijosQueCubrenBD({ lat, lng }, radioKm),
})

async function seedData(): Promise<void> {
  console.log('🌱 [SEED UNIFICADO] Iniciando carga de datos en emuladores...')

  try {
    // 1. Construir dataset completo desde data.ts
    const hojasLista = construirHojas()
    const hojas: Hojas = {}
    for (const h of hojasLista) {
      hojas[h.nombre] = h.filas
    }

    console.log(`📦 Hojas generadas: ${Object.keys(hojas).length} hojas. Mapeando plan...`)
    const plan = construirPlan(hojas)

    console.log(`🚀 Importando entidades con Admin SDK (Auth + Firestore)...`)
    console.log(`   - Usuarios a cargar: ${plan.usuarios.length} (+500 de Zona Sur)`)
    console.log(`   - Predios: ${plan.predios.length}`)
    console.log(`   - Equipos: ${plan.equipos.length}`)
    console.log(`   - Desafíos: ${plan.desafios.length}`)
    console.log(`   - Partidos: ${plan.partidos.length}`)

    const resumen = await importarPlan(plan)

    console.log('\n✅ Importación de entidades completada:')
    console.log(`   ✔️  Usuarios creados en Auth y Firestore: ${resumen.usuarios}`)
    console.log(`   ✔️  Predios registrados: ${resumen.predios}`)
    console.log(`   ✔️  Canchas configuradas: ${resumen.canchas}`)
    console.log(`   ✔️  Equipos registrados: ${resumen.equipos}`)
    console.log(`   ✔️  Desafíos publicados: ${resumen.desafios}`)
    console.log(`   ✔️  Partidos activos: ${resumen.partidos}`)
    console.log(`   ✔️  Postulaciones: ${resumen.postulaciones}`)
    if (resumen.errores.length > 0) {
      console.warn(`   ⚠️ Advertencias: ${resumen.errores.length}`)
      resumen.errores.slice(0, 5).forEach((e) => console.warn(`      ${e}`))
    }

    // 2. Generar 7 días de turnos para cada cancha de predios verificados
    console.log('\n📅 Generando 7 días de turnos disponibles en predios verificados...')
    const prediosSnap = await db.collection('predios').where('verificado', '==', true).get()
    const franjasBase: Array<[string, string]> = [
      ['18:00', '19:00'],
      ['19:00', '20:00'],
      ['20:00', '21:00'],
      ['21:00', '22:00'],
    ]
    const hoy = new Date()
    let totalTurnos = 0

    for (const pDoc of prediosSnap.docs) {
      const p = pDoc.data()
      const canchasSnap = await pDoc.ref.collection('canchas').get()
      const puntoLat = p.geo?.lat ?? -34.7042
      const puntoLng = p.geo?.lng ?? -58.3965

      const batch = db.batch()
      let batchCount = 0

      for (const cDoc of canchasSnap.docs) {
        const c = cDoc.data()
        for (let i = 0; i < 7; i++) {
          const fechaD = new Date(hoy.getTime() + i * 86_400_000)
          const fechaStr = fechaD.toISOString().slice(0, 10)
          for (const [horaInicio, horaFin] of franjasBase) {
            const turnoId = `${p.id}~${c.id}~${fechaStr}T${horaInicio}`
            const turnoRef = db.collection('turnos').doc(turnoId)
            batch.set(
              turnoRef,
              {
                id: turnoId,
                predioId: p.id,
                canchaId: c.id,
                fecha: fechaStr,
                horaInicio,
                horaFin,
                estado: 'disponible',
                origen: 'carga_manual_dueno',
                precioTotal: Number(c.precioHora || 8000),
                montoSena: Number(p.cobro?.montoSena || 4000),
                organizadorUid: null,
                organizadorNombre: null,
                organizadorTelefono: null,
                comprobantePendiente: false,
                motivoRechazo: null,
                bloqueadoHasta: null,
                expiracionNotificada: false,
                canceladoPor: null,
                geo: geo(puntoLat, puntoLng),
                partidoId: null,
                createdAt: serverTimestamp,
                updatedAt: serverTimestamp,
                deletedAt: null,
              },
              { merge: true },
            )
            batchCount++
            totalTurnos++
          }
        }
      }

      if (batchCount > 0) {
        await batch.commit()
      }
      console.log(`   ✔️  ${p.nombre} (${p.barrio}) -> canchas listas con turnos`)
    }

    console.log(`\n🎉 SEED EXITOSO: ${totalTurnos} turnos generados.`)
    console.log('   Cuentas principales (password: password123):')
    console.log('     superadmin@fulbeando.com   (Superadmin)')
    console.log('     dueno.templo@fulbeando.com (Dueño El Templo - Lanús)')
    console.log('     dueno.lomas@fulbeando.com  (Dueña Complejo Lomas)')
    console.log('     cuti@alangulo.com          (Jugador Scaloneta - Lomas)')
    console.log('     lio@alangulo.com           (Capitán Scaloneta - Lanús)')
    console.log('     dibu@alangulo.com          (Arquero Scaloneta - Avellaneda)')
    console.log('     capitan.rojo@fulbeando.com (Capitán Rojo)')
    console.log('     sur001@fulbeando.com       a sur500@fulbeando.com (500 jugadores Zona Sur)')
    console.log('')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ ERROR EN SEED:', error)
    process.exit(1)
  }
}

seedData()