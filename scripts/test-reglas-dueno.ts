/**
 * Verificacion de las reglas del dueno de predio contra el emulador.
 *
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx tsx scripts/test-reglas-dueno.ts
 *
 * Cubre el contrato nuevo: elegir "Tengo un Complejo" no habilita nada por si
 * solo. El rol es `dueno_predio` pero el plan queda `pendiente`, y recien con
 * el plan activo se puede dar de alta un predio.
 *
 *  1. Dueno SIN plan activo crea un predio      -> denegado
 *  2. Dueno CON plan activo crea un predio      -> permitido
 *  3. Dueno sin plan crea un equipo             -> denegado
 *  4. Dueno con plan crea un equipo             -> denegado
 *  5. Dueno se suma a un equipo existente       -> denegado
 *  6. Dueno le rearma la ficha de jugador       -> denegado
 *  7. Dueno reescribe `perfilDeportivo` igual   -> permitido (no es un cambio)
 *  8. Dueno edita direccion y ubicacion         -> permitido
 *  9. Dueno edita el predio de OTRO             -> denegado
 * 10. Un jugador existente se pasa a dueno      -> denegado (cuenta nueva)
 */

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PROJECT_ID = 'fulbeando-rules-test-dueno'
const USUARIOS = 'usuarios'
const PREDIOS = 'predios'
const EQUIPOS = 'teams'

const PENDIENTE = 'uid_dueno_pendiente'
const ACTIVO = 'uid_dueno_activo'
const JUGADOR = 'uid_jugador'
const CAPITAN = 'uid_capitan'

let env: RulesTestEnvironment

const db = (uid: string) =>
  env.authenticatedContext(uid).firestore() as unknown as {
    doc(path: string): {
      get(): Promise<{ exists(): boolean; data(): unknown }>
      set(data: unknown): Promise<unknown>
      update(data: unknown): Promise<unknown>
    }
  }

const baseUsuario = (rol: string, extra: Record<string, unknown> = {}) => ({
  nombre: 'Prueba',
  apellido: 'Reglas',
  email: 'prueba@test.com',
  telefono: null,
  whatsappVerificado: false,
  rol,
  perfilDeportivo: null,
  geo: null,
  zona: null,
  fotoUrl: null,
  estado: 'activo',
  deletedAt: null,
  ...extra,
})

/** Documento minimo de predio: lo que `crearPredio` escribe. */
const predioDoc = (duenoUid: string) => ({
  nombre: 'Complejo De Prueba',
  direccion: 'Calle Vieja 1',
  barrio: 'Centro',
  ciudad: 'Lanus',
  barrioNormalizado: 'centro',
  geo: {
    lat: -34.7,
    lng: -58.39,
    prefijo: '6gyfr',
    prefijos: ['6gyfr'],
  },
  telefono: '1122334455',
  fotos: [],
  cobro: { titular: '', alias: '', cbu: null, montoSena: 15000 },
  duenoUid,
  canchasResumen: [],
  verificado: false,
  estado: 'activo',
  deletedAt: null,
})

let fallos = 0

async function comprobar(titulo: string, esperado: 'permitido' | 'denegado', fn: () => Promise<unknown>) {
  let paso = false
  try {
    await fn()
    paso = true
  } catch {
    paso = false
  }
  const ok = esperado === 'permitido' ? paso : !paso
  if (!ok) fallos += 1
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${titulo} — ${esperado}`)
}

async function main() {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: process.env.FIRESTORE_EMULATOR_HOST.split(':')[0],
      port: Number(process.env.FIRESTORE_EMULATOR_HOST.split(':')[1]),
      rules: readFileSync(resolve(process.cwd(), 'app/firebase/firestore.rules'), 'utf8'),
    },
  })

  // Estado inicial con las reglas apagadas: asi cada caso aislada la regla que
  // nos interesa y no la de creacion de usuario.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore() as unknown as { doc(path: string): { set(data: unknown): Promise<unknown> } }
    await d
      .doc(`${USUARIOS}/${PENDIENTE}`)
      .set(baseUsuario('dueno_predio', { planDueno: 'pendiente' }))
    await d
      .doc(`${USUARIOS}/${ACTIVO}`)
      .set(baseUsuario('dueno_predio', { planDueno: 'activo' }))
    await d.doc(`${USUARIOS}/${JUGADOR}`).set(
      baseUsuario('jugador', {
        perfilDeportivo: {
          posicion: null,
          piernaHabil: null,
          nivel: null,
          disponibleHoy: false,
          notificacionesRadar: true,
          playerRole: null,
          stats: { goals: 0, matchesPlayed: 0, mvpCount: 0, fairPlayIndex: 100 },
          rating: 5,
          teamIds: [],
        },
      }),
    )
    await d.doc(`${USUARIOS}/${CAPITAN}`).set(baseUsuario('jugador'))
    await d.doc(`${PREDIOS}/predio_del_activo`).set(predioDoc(ACTIVO))
    await d.doc(`${PREDIOS}/predio_del_otro`).set(predioDoc(CAPITAN))
    await d.doc(`${EQUIPOS}/eq_existente`).set({
      name: 'Equipo Existente',
      captainId: CAPITAN,
      members: [{ uid: CAPITAN, name: 'Capitan Reglas', role: 'CAPITAN' }],
    })
  })

  console.log('REGLAS DEL DUENO DE PREDIO')

  await comprobar('1. dueno sin plan crea predio', 'denegado', () =>
    db(PENDIENTE).doc(`${PREDIOS}/predio_nuevo_1`).set(predioDoc(PENDIENTE)),
  )

  await comprobar('2. dueno con plan crea predio', 'permitido', () =>
    db(ACTIVO).doc(`${PREDIOS}/predio_nuevo_2`).set(predioDoc(ACTIVO)),
  )

  await comprobar('3. dueno sin plan crea equipo', 'denegado', () =>
    db(PENDIENTE)
      .doc(`${EQUIPOS}/eq_nuevo_pend`)
      .set({
        name: 'Equipo Del Pendiente',
        captainId: PENDIENTE,
        members: [{ uid: PENDIENTE, name: 'Pendiente', role: 'CAPITAN' }],
      }),
  )

  await comprobar('4. dueno con plan crea equipo', 'denegado', () =>
    db(ACTIVO)
      .doc(`${EQUIPOS}/eq_nuevo_act`)
      .set({
        name: 'Equipo Del Activo',
        captainId: ACTIVO,
        members: [{ uid: ACTIVO, name: 'Activo', role: 'CAPITAN' }],
      }),
  )

  await comprobar('5. dueno se suma a un equipo existente', 'denegado', () =>
    db(PENDIENTE)
      .doc(`${EQUIPOS}/eq_existente`)
      .update({
        members: [
          { uid: CAPITAN, name: 'Capitan Reglas', role: 'CAPITAN' },
          { uid: PENDIENTE, name: 'Pendiente', role: 'PLAYER' },
        ],
      }),
  )

  const fichaDeJugador = {
    posicion: 'delantero',
    piernaHabil: 'diestro',
    nivel: 4,
    disponibleHoy: false,
    notificacionesRadar: false,
    playerRole: 'FWD',
    stats: { goals: 0, matchesPlayed: 0, mvpCount: 0, fairPlayIndex: 100 },
    rating: 5,
    teamIds: [],
  }

  await comprobar('6. dueno rearma su ficha de jugador', 'denegado', () =>
    db(ACTIVO).doc(`${USUARIOS}/${ACTIVO}`).update({ perfilDeportivo: fichaDeJugador }),
  )

  await comprobar('7. dueno reescribe perfilDeportivo identico', 'permitido', () =>
    db(ACTIVO).doc(`${USUARIOS}/${ACTIVO}`).update({ perfilDeportivo: null }),
  )

  await comprobar('8. dueno edita direccion y ubicacion de su predio', 'permitido', () =>
    db(ACTIVO).doc(`${PREDIOS}/predio_del_activo`).update({
      direccion: 'Avenida Nueva 999',
      barrio: 'Los Hornos',
      barrioNormalizado: 'los hornos',
      geo: { lat: -34.71, lng: -58.4, prefijo: '6gyfs', prefijos: ['6gyfs'] },
    }),
  )

  await comprobar('9. dueno edita el predio de otro', 'denegado', () =>
    db(ACTIVO).doc(`${PREDIOS}/predio_del_otro`).update({ direccion: 'Robada 1' }),
  )

  await comprobar('10. jugador existente se pasa a dueno', 'denegado', () =>
    db(JUGADOR).doc(`${USUARIOS}/${JUGADOR}`).update({ rol: 'dueno_predio' }),
  )

  await env.cleanup()

  console.log(fallos === 0 ? '\n✅ Reglas del dueno OK' : `\n❌ ${fallos} falla(s)`)
  process.exit(fallos === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
