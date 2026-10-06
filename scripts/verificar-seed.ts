/**
 * Verifica que el seed y los indices quedaron alineados con las queries reales
 * de la app. Corre las MISMAS consultas que hace el mapa unificado.
 *
 *   1. Levanta los emuladores:  npm run dev:emulators
 *   2. Sembrar:                 npm run seed:wait
 *   3. Verificar:               npx tsx scripts/verificar-seed.ts
 */
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'

import * as admin from 'firebase-admin'
import { prefijosQueCubren } from '../app/src/core/geo/geohash'
import { PROJECT_ID } from './proyecto-emulador'

// Mismo proyecto que el seed y que la app: verificar contra un namespace
// distinto daba "todo verde" sobre datos que la app nunca iba a leer.
admin.initializeApp({ projectId: PROJECT_ID })
const db = admin.firestore()

const LANUS = { lat: -34.7042, lng: -58.3965 }
const RADIO_KM = 5

let fallas = 0
const check = (nombre: string, ok: boolean, detalle = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${nombre}${detalle ? ` — ${detalle}` : ''}`)
  if (!ok) fallas++
}

async function main() {
  const prefijos = prefijosQueCubren(LANUS, RADIO_KM, 5)
  console.log(`\nConsultando desde Lanús, radio ${RADIO_KM} km (${prefijos.length} prefijos)\n`)

  // Query exacta de radarService.listarDesafiosCercanos
  const desafios = await db
    .collection('challenges')
    .where('geo.prefijos', 'array-contains-any', prefijos)
    .where('estado', '==', 'ABIERTO')
    .limit(20)
    .get()

  console.log('DESAFIOS (capa "Desafios" del mapa)')
  check('la query encuentra desafios', desafios.size > 0, `${desafios.size} encontrados`)
  for (const d of desafios.docs) {
    const j = d.data()
    const completo =
      j.creatorId && j.equipoId && j.equipoNombre && j.modalidad && j.estadoCancha && j.fechaUnix
    check(`  ${j.equipoNombre}`, Boolean(completo), `estado=${j.estado} modalidad=${j.modalidad}`)
  }

  // Query exacta de listarCandidatosRadar
  const candidatos = await db
    .collection('usuarios')
    .where('geo.prefijos', 'array-contains-any', prefijos)
    .where('estado', '==', 'activo')
    .where('perfilDeportivo.disponibleHoy', '==', true)
    .where('perfilDeportivo.notificacionesRadar', '==', true)
    .get()

  console.log('\nJUGADORES (capa "Jugadores" del mapa)')
  check('la query encuentra candidatos', candidatos.size > 0, `${candidatos.size} encontrados`)
  for (const d of candidatos.docs) {
    const u = d.data()
    check(
      `  ${u.nombre} ${u.apellido}`,
      u.perfilDeportivo !== null && u.fotoUrl !== undefined,
      `posicion=${u.perfilDeportivo?.posicion} zona=${u.zona}`,
    )
  }

  // Query de predios publicos: verificado + activo (predio.esPublico)
  const predios = await db.collection('predios').where('estado', '==', 'activo').get()
  const publicos = predios.docs.map((d) => d.data()).filter((p) => p.verificado && p.deletedAt === null)
  console.log('\nPREDIOS (capa "Canchas" del mapa)')
  check('hay predios publicos', publicos.length > 0, `${publicos.length} de ${predios.size}`)
  for (const p of publicos) {
    check(`  ${p.nombre}`, p.geo?.prefijos?.length > 0, `${p.canchasResumen.length} canchas`)
  }

  // Equipos
  const equipos = await db.collection('teams').get()
  console.log('\nEQUIPOS')
  check('hay equipos', equipos.size > 0, `${equipos.size}`)
  for (const d of equipos.docs) {
    const e = d.data()
    const capitan = e.members?.find((m: any) => m.uid === e.captainId)
    check(`  ${e.name}`, e.members?.length > 0 && capitan?.role === 'CAPTAIN', `${e.members.length} miembros`)
  }

  // Capa de equipos del area: misma query que listarEquiposCercanos
  const equiposCerca = await db
    .collection('teams')
    .where('geo.prefijos', 'array-contains-any', prefijos)
    .limit(30)
    .get()
  console.log('\nEQUIPOS DEL AREA (capa "Equipos" del mapa)')
  check('la query encuentra equipos', equiposCerca.size > 0, `${equiposCerca.size} encontrados`)

  // Reglas de negocio: tope de 2 equipos y 23 fichas por equipo.
  console.log('\nREGLAS DE NEGOCIO')
  const todosLosUsuarios = await db.collection('usuarios').get()
  for (const d of todosLosUsuarios.docs) {
    const u = d.data()
    const n = u.perfilDeportivo?.teamIds?.length ?? 0
    check(`${u.nombre} tiene ${n} equipo(s)`, n <= 2)
  }
for (const d of equipos.docs) {
    const e = d.data()
    const jugadores = e.members.filter((m: any) => m.role !== 'CAPITAN').length
    check(`${e.name} tiene ${jugadores} jugadores`, jugadores <= 22, `${e.members.length} fichas en total`)
  }

  // Coherencia del puente bidireccional: `teams.members` <-> `usuarios.teamIds`.
  // Si esto se rompe, "Mis equipos" muestra un equipo del que el usuario no es
  // miembro, o el jugador aparece en un plantel sin saberlo.
  console.log('\nCOHERENCIA DEL PUENTE EQUIPOS <-> USUARIOS')
  const idsDeEquipo = new Set(equipos.docs.map((d) => d.id))
  for (const d of equipos.docs) {
    const e = d.data()
    for (const m of e.members as any[]) {
      const snap = await db.collection('usuarios').doc(m.uid).get()
      const ids = snap.data()?.perfilDeportivo?.teamIds ?? []
      check(
        `${m.name} figura en ${e.name}`,
        Array.isArray(ids) && ids.includes(e.id),
        Array.isArray(ids) && ids.length ? ids.join(', ') : 'sin equipos en su perfil',
      )
    }
  }
  for (const d of todosLosUsuarios.docs) {
    const u = d.data()
    for (const teamId of u.perfilDeportivo?.teamIds ?? []) {
      check(`${u.nombre} apunta a ${teamId}, que existe`, idsDeEquipo.has(teamId))
    }
  }

  // El puente `usuarios` <-> `predios` es lo que habilita el panel del dueño:
  // el guard de la ruta pide `rol: 'dueno_predio'` Y las rules piden que el
  // `duenoUid` del predio coincida. Si las dos caras no coinciden, el dueño
  // entra a un panel vacio o recibe PERMISSION_DENIED al aprobar un turno.
  console.log('\nRAMAS DEL PRD (jugador / dueño de predio)')
  const roles = await db.collection('usuarios').get()
  const porRol = new Map<string, number>()
  for (const d of roles.docs) {
    const rol = (d.data().rol as string) ?? '(sin rol)'
    porRol.set(rol, (porRol.get(rol) ?? 0) + 1)
  }
  for (const [rol, n] of porRol) console.log(`  ${rol}: ${n}`)
  check(
    'hay al menos una cuenta dueno_predio',
    (porRol.get('dueno_predio') ?? 0) > 0,
    'sin esto /venue-dashboard no abre',
  )
  check(
    'hay al menos una cuenta jugador',
    (porRol.get('jugador') ?? 0) > 0,
  )

  const prediosDb = await db.collection('predios').get()
  const uids = new Set(roles.docs.map((d) => d.id))
  for (const d of prediosDb.docs) {
    const p = d.data()
    const dueno = roles.docs.find((u) => u.id === p.duenoUid)
    check(`${p.nombre} tiene duenoUid existente`, uids.has(p.duenoUid), String(p.duenoUid))
    check(
      `${p.nombre}: su dueno tiene rol dueno_predio`,
      dueno?.data().rol === 'dueno_predio',
      `rol=${dueno?.data().rol ?? 'inexistente'}`,
    )
  }

  console.log(`\n${fallas === 0 ? '✅ Todo alineado' : `❌ ${fallas} falla(s)`}\n`)
  process.exit(fallas === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})