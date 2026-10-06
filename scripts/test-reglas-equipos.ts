/**
 * Verificacion de las reglas de equipo contra el emulador.
 *
 * Corre con `npm run test:rules` (ver package.json). Levanta el emulador de
 * Firestore, siembra el estado minimo con las reglas apagadas, y despues prueba
 * con las reglas ENCENDIDAS los casos que importan:
 *
 *  1. El capitan crea el equipo y su perfil queda con el id en `teamIds`.
 *  2. Un jugador se une a si mismo -> permitido.
 *  3. Un jugador NO puede agregar a un tercero -> denegado.
 *  4. Un jugador NO puede cambiar la capitania -> denegado.
 *  5. Un jugador NO puede editar el perfil de otro -> denegado.
 *  6. Un jugador NO puede autocorregirse el dorsal -> denegado.
 *  7. El capitan carga el dorsal -> permitido.
 *  8. No se puede borrar un equipo.
 *  9. Tope de 23 fichas por equipo (22 jugadores + organizador) -> 23 va, 24 no.
 * 10. Tope de 2 equipos por jugador en `perfilDeportivo.teamIds` -> 2 va, 3 no.
 *
 * NOTA: se usa el SDK **compat** porque `RulesTestContext.firestore()` lo
 * devuelve. Lo que se prueba son las REGLAS, no el cliente: la API modular y la
 * compat generan exactamente la misma peticion.
 */

import { arrayRemove, arrayUnion } from 'firebase/firestore'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PROJECT_ID = 'fulbeando-rules-test'
const USUARIOS = 'usuarios'
const EQUIPOS = 'teams'

const CAPITAN = 'uid_capitan'
const JUGADOR = 'uid_jugador'
const TERCERO = 'uid_tercero'

let env: RulesTestEnvironment

/** Instancia de Firestore ya conectada al emulador para el usuario dado. */
const db = (uid: string) =>
  env.authenticatedContext(uid).firestore() as unknown as {
    doc(path: string): { get(): Promise<unknown>; set(data: unknown): Promise<unknown>; update(data: unknown): Promise<unknown>; delete(): Promise<unknown> }
  }

/**
 * `arrayUnion` viene del SDK modular aunque escribamos contra la instancia
 * compat: los centinelas `FieldValue` viajan en el protocolo, asi que son
 * intercambiables entre las dos APIs.
 */
const FieldValue = { arrayUnion }

const usuarioDoc = (nombre: string) => ({
  nombre,
  apellido: 'Prueba',
  email: `${nombre}@test.com`,
  telefono: null,
  whatsappVerificado: false,
  rol: 'jugador',
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
  geo: null,
  zona: null,
  fotoUrl: null,
  estado: 'activo',
  deletedAt: null,
})

let fallos = 0

async function comprobar(titulo: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn()
    console.log(`  PASS  ${titulo}`)
  } catch (error) {
    fallos += 1
    const motivo = error instanceof Error ? error.message.split('\n')[0] : String(error)
    console.log(`  FAIL  ${titulo}`)
    console.log(`        ${motivo}`)
  }
}

async function main(): Promise<void> {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] ?? '127.0.0.1',
      port: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] ?? 8080),
      rules: readFileSync(resolve(process.cwd(), 'app/firebase/firestore.rules'), 'utf8'),
    },
  })

  // Estado inicial sembrado con las reglas apagadas: asi los casos prueban la
  // regla que nos interesa y no la de creacion de usuario.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore() as unknown as {
      doc(path: string): { set(data: unknown): Promise<unknown> }
    }
    await d.doc(`${USUARIOS}/${CAPITAN}`).set(usuarioDoc('Capitan'))
    await d.doc(`${USUARIOS}/${JUGADOR}`).set(usuarioDoc('Jugador'))
    await d.doc(`${USUARIOS}/${TERCERO}`).set(usuarioDoc('Tercero'))
    await d.doc(`${EQUIPOS}/eq_test`).set({
      id: 'eq_test',
      name: 'La Scaloneta',
      shieldUrl: null,
      modalidadBase: 'F5',
      captainId: CAPITAN,
      members: [{ uid: CAPITAN, name: 'Capitan Prueba', role: 'CAPITAN' }],
      stats: { wins: 0, draws: 0, losses: 0 },
    })
  })

  console.log('\nReglas de equipos (app/firebase/firestore.rules):\n')

  await comprobar('el capitan crea un equipo', () =>
    assertSucceeds(
      db(CAPITAN).doc(`${EQUIPOS}/eq_nuevo`).set({
        id: 'eq_nuevo',
        name: 'Equipo Nuevo',
        shieldUrl: null,
        modalidadBase: 'F7',
        captainId: CAPITAN,
        members: [{ uid: CAPITAN, name: 'Capitan Prueba', role: 'CAPITAN' }],
        stats: { wins: 0, draws: 0, losses: 0 },
      }),
    ),
  )

  await comprobar('el capitan vincula el equipo a su propio perfil', async () => {
    await assertSucceeds(
      db(CAPITAN).doc(`${USUARIOS}/${CAPITAN}`).update({
        perfilDeportivo: { teamIds: FieldValue.arrayUnion('eq_test') },
      }),
    )
    const snap = (await db(CAPITAN).doc(`${USUARIOS}/${CAPITAN}`).get()) as {
      data: () => { perfilDeportivo?: { teamIds?: unknown } }
    }
    const ids = snap.data().perfilDeportivo?.teamIds
    if (!Array.isArray(ids) || !ids.includes('eq_test')) {
      throw new Error(`teamIds no quedo enlazado: ${JSON.stringify(ids)}`)
    }
  })

  await comprobar('el jugador se une a si mismo (autoinscripcion)', () =>
    assertSucceeds(
      db(JUGADOR).doc(`${EQUIPOS}/eq_test`).update({
        members: FieldValue.arrayUnion({ uid: JUGADOR, name: 'Jugador Prueba', role: 'PLAYER' }),
      }),
    ),
  )

  await comprobar('un jugador NO puede agregar a un tercero', () =>
    assertFails(
      db(JUGADOR).doc(`${EQUIPOS}/eq_test`).update({
        members: FieldValue.arrayUnion({ uid: TERCERO, name: 'Tercero Prueba', role: 'PLAYER' }),
      }),
    ),
  )

  await comprobar('un jugador NO puede cambiar la capitania', () =>
    assertFails(db(JUGADOR).doc(`${EQUIPOS}/eq_test`).update({ captainId: JUGADOR })),
  )

  await comprobar('un jugador NO puede editar el perfil de otro', () =>
    assertFails(
      db(JUGADOR).doc(`${USUARIOS}/${TERCERO}`).update({
        perfilDeportivo: { teamIds: FieldValue.arrayUnion('eq_test') },
      }),
    ),
  )

  await comprobar('un jugador NO puede autoconcederse el dorsal', () =>
    assertFails(
      db(JUGADOR).doc(`${EQUIPOS}/eq_test`).update({
        members: FieldValue.arrayUnion({
          uid: JUGADOR,
          name: 'Jugador Prueba',
          role: 'PLAYER',
          dorsal: 10,
        }),
      }),
    ),
  )

  await comprobar('el capitan carga el dorsal', () =>
    assertSucceeds(
      db(CAPITAN).doc(`${EQUIPOS}/eq_test`).update({
        members: FieldValue.arrayUnion({
          uid: JUGADOR,
          name: 'Jugador Prueba',
          role: 'PLAYER',
          dorsal: 10,
        }),
      }),
    ),
  )

  await comprobar('no se puede borrar un equipo', () =>
    assertFails(db(CAPITAN).doc(`${EQUIPOS}/eq_test`).delete()),
  )

  await comprobar('el jugador se desvincula al salir del equipo', () =>
    assertSucceeds(
      db(JUGADOR).doc(`${USUARIOS}/${JUGADOR}`).update({
        perfilDeportivo: { teamIds: arrayRemove('eq_test') },
      }),
    ),
  )

  // ------------------------------------------------------------------ //
  // Tope de fichas por equipo: 22 jugadores + 1 organizador = 23
  // ------------------------------------------------------------------ //

  /** Construye un plantel de `total` fichas, con el capitan al principio. */
  const plantelDe = (total: number) => [
    { uid: CAPITAN, name: 'Capitan Prueba', role: 'CAPTAIN' },
    ...Array.from({ length: total - 1 }, (_, i) => ({
      uid: `uid_${total}_${i}`,
      name: `Jugador ${total}-${i}`,
      role: 'PLAYER',
    })),
  ]

  await comprobar('el equipo admite 23 fichas (22 jugadores + organizador)', () =>
    assertSucceeds(
      db(CAPITAN).doc(`${EQUIPOS}/eq_top`).set({
        id: 'eq_top',
        name: 'Equipo Al Limite',
        shieldUrl: null,
        modalidadBase: 'F5',
        captainId: CAPITAN,
        members: plantelDe(23),
        stats: { wins: 0, draws: 0, losses: 0 },
      }),
    ),
  )

  await comprobar('el equipo NO admite 24 fichas', () =>
    assertFails(
      db(CAPITAN).doc(`${EQUIPOS}/eq_sobre`).set({
        id: 'eq_sobre',
        name: 'Equipo Sobre Limite',
        shieldUrl: null,
        modalidadBase: 'F5',
        captainId: CAPITAN,
        members: plantelDe(24),
        stats: { wins: 0, draws: 0, losses: 0 },
      }),
    ),
  )

  await comprobar('un equipo vacio NO se puede crear', () =>
    assertFails(
      db(CAPITAN).doc(`${EQUIPOS}/eq_vacio`).set({
        id: 'eq_vacio',
        name: 'Equipo Vacio',
        shieldUrl: null,
        modalidadBase: 'F5',
        captainId: CAPITAN,
        members: [],
        stats: { wins: 0, draws: 0, losses: 0 },
      }),
    ),
  )

  // ------------------------------------------------------------------ //
  // Tope de 2 equipos por jugador (contando el propio que creo)
  // ------------------------------------------------------------------ //

  await comprobar('el jugador puede tener 2 equipos', () =>
    assertSucceeds(
      db(JUGADOR).doc(`${USUARIOS}/${JUGADOR}`).update({
        perfilDeportivo: { teamIds: ['eq_a', 'eq_b'] },
      }),
    ),
  )

  await comprobar('el jugador NO puede tener 3 equipos', () =>
    assertFails(
      db(JUGADOR).doc(`${USUARIOS}/${JUGADOR}`).update({
        perfilDeportivo: { teamIds: ['eq_a', 'eq_b', 'eq_c'] },
      }),
    ),
  )

  await comprobar('un usuario sin perfilDeportivo puede guardarse igual', () =>
    assertSucceeds(
      db(TERCERO).doc(`${USUARIOS}/${TERCERO}`).update({
        perfilDeportivo: {
          posicion: null,
          disponibleHoy: true,
          notificacionesRadar: false,
          teamIds: ['eq_x'],
        },
      }),
    ),
  )

  await env.cleanup()

  console.log(
    fallos === 0
      ? '\nTodas las reglas se comportaron como se espera.\n'
      : `\n${fallos} caso(s) fallaron.\n`,
  )
  process.exit(fallos === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})