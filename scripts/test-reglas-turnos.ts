/**
 * Verificacion de las reglas de turnos / comprobantes / alertas contra el emulador.
 *
 * Corre con `npm run test:rules` (ver package.json).
 *
 * CONTEXTO: estas reglas estaban rotas y nadie lo noto porque no habia tests.
 * Las rules pedian `jugadorId`, un campo que el cliente nunca escribe (el
 * dominio se llama `organizadorUid`). Como `undefined != request.auth.uid`,
 * TODA reserva online caia en PERMISSION_DENIED: el flujo principal de la app,
 * "el jugador reserva desde el radar", era inalcanzable. Estos tests existen
 * para que un renombre de campo no vuelva a romperlo en silencio.
 *
 * Se usa el SDK **compat** porque `RulesTestContext.firestore()` lo devuelve.
 * Lo que se prueba son las REGLAS, no el cliente.
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
// Se usa el constructor real de `GeoIndex` en vez de escribir el objeto a mano:
// una version anterior del fixture traia `geohash`/`precisionM`, campos que NO
// existen en el dominio. Con `prefijo` ausente, la regla del update de alertas
// comparaba `undefined == undefined` y pasaba sin proteger nada.
import { aGeoIndex } from '../app/src/core/geo/index'

const PROJECT_ID = 'fulbeando-rules-turnos'
const USUARIOS = 'usuarios'
const PREDIOS = 'predios'
const TURNOS = 'turnos'
const COMPROBANTES = 'comprobantes'
const ALERTAS = 'alertas'

const DUENO = 'uid_dueno'
const JUGADOR = 'uid_jugador'
const TERCERO = 'uid_tercero'

const PREDIO = 'predio_1'
const CANCHA = 'cancha_1'

let env: RulesTestEnvironment

type Doc = {
  get(): Promise<unknown>
  set(data: unknown): Promise<unknown>
  update(data: unknown): Promise<unknown>
  delete(): Promise<unknown>
}

const db = (uid: string) =>
  env.authenticatedContext(uid).firestore() as unknown as {
    doc(path: string): Doc
  }

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

const geo = aGeoIndex({ lat: -34.68, lng: -58.4 })

const usuarioDoc = (nombre: string, rol: string) => ({
  nombre,
  apellido: 'Prueba',
  email: `${nombre}@test.com`,
  telefono: null,
  rol,
  perfilDeportivo: null,
  geo: null,
  estado: 'activo',
  deletedAt: null,
})

/** Turno tal como lo escribe `grillaDePredio`: siempre nace `disponible`. */
const turnoDoc = (over: Record<string, unknown> = {}) => ({
  id: 't1',
  predioId: PREDIO,
  canchaId: CANCHA,
  fecha: '2099-06-01',
  horaInicio: '20:00',
  horaFin: '21:00',
  estado: 'disponible',
  origen: 'reserva_online',
  precioTotal: 12000,
  montoSena: 4000,
  organizadorUid: null,
  organizadorNombre: null,
  organizadorTelefono: null,
  comprobantePendiente: false,
  motivoRechazo: null,
  bloqueadoHasta: null,
  expiracionNotificada: false,
  canceladoPor: null,
  geo,
  partidoId: null,
  deletedAt: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...over,
})

/**
 * Estado bloqueado tal como lo escribe `reservarTurno`. `bloqueadoHasta` es
 * obligatorio: la rule lo exige porque es el deadline de 15 min de la regla 6.1.
 */
const bloqueoDoc = (over: Record<string, unknown> = {}) => ({
  ...turnoDoc(),
  estado: 'bloqueado_temporal',
  comprobantePendiente: true,
  bloqueadoHasta: new Date(Date.now() + 15 * 60 * 1000),
  ...over,
})

const comprobanteDoc = (over: Record<string, unknown> = {}) => ({
  turnoId: 't1',
  organizadorUid: JUGADOR,
  storagePath: `comprobantes/${JUGADOR}/t1/foto.png`,
  mimeType: 'image/png',
  sizeBytes: 120_000,
  alias: 'Fulbeando CBU',
  monto: 4000,
  subidoAt: new Date(0),
  revisadoPor: null,
  revisadoAt: null,
  verificado: false,
  motivoRechazo: null,
  ...over,
})

const alertaDoc = (over: Record<string, unknown> = {}) => ({
  id: 'falta1_t1',
  turnoId: 't1',
  predioId: PREDIO,
  canchaId: CANCHA,
  fecha: '2099-06-01',
  horaInicio: '20:00',
  horaFin: '21:00',
  geo,
  cantidadRequeridos: 1,
  posicionBuscada: 'cualquiera',
  notas: null,
  creadoPorUid: JUGADOR,
  estado: 'activa',
  confirmados: 0,
  expiraEn: new Date(0),
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...over,
})

async function main(): Promise<void> {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] ?? '127.0.0.1',
      port: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] ?? 8080),
      rules: readFileSync(resolve(process.cwd(), 'app/firebase/firestore.rules'), 'utf8'),
    },
  })

  // Estado sembrado con las reglas apagadas.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore() as unknown as { doc(path: string): Doc }
    await d.doc(`${USUARIOS}/${DUENO}`).set(usuarioDoc('Dueno', 'dueno_predio'))
    await d.doc(`${USUARIOS}/${JUGADOR}`).set(usuarioDoc('Jugador', 'jugador'))
    await d.doc(`${USUARIOS}/${TERCERO}`).set(usuarioDoc('Tercero', 'jugador'))

    await d.doc(`${PREDIOS}/${PREDIO}`).set({
      id: PREDIO,
      nombre: 'El Templo',
      duenoUid: DUENO,
      direccion: 'Cali 123',
      zona: 'Lanus',
      estado: 'activo',
      deletedAt: null,
    })

    // t1: libre. t2: ya reservado por el JUGADOR. t3: confirmado del TERCERO.
    await d.doc(`${TURNOS}/t1`).set(turnoDoc({ id: 't1' }))
    await d
      .doc(`${TURNOS}/t2`)
      .set(
        turnoDoc({
          id: 't2',
          estado: 'bloqueado_temporal',
          organizadorUid: JUGADOR,
          organizadorNombre: 'Jugador',
          comprobantePendiente: true,
        }),
      )
    await d
      .doc(`${TURNOS}/t3`)
      .set(
        turnoDoc({
          id: 't3',
          estado: 'confirmado',
          organizadorUid: TERCERO,
          organizadorNombre: 'Tercero',
        }),
      )

    // t_tx: libre, reservado para el test de transaccion.
    await d.doc(`${TURNOS}/t_tx`).set(turnoDoc({ id: 't_tx' }))
  })

  // ------------------------------------------------------------------ //
  // Alta de grilla (solo el dueno)
  // ------------------------------------------------------------------ //
  console.log('\nALTA DE GRILLA (dueno)')

  await comprobar('el dueno carga un turno disponible', () =>
    assertSucceeds(db(DUENO).doc(`${TURNOS}/t_nuevo`).set(turnoDoc({ id: 't_nuevo' }))),
  )

  await comprobar('un jugador NO puede cargar turnos', () =>
    assertFails(db(JUGADOR).doc(`${TURNOS}/t_intruso`).set(turnoDoc({ id: 't_intruso' }))),
  )

  await comprobar('el dueno NO puede cargar un turno ya confirmado', () =>
    assertFails(
      db(DUENO)
        .doc(`${TURNOS}/t_confirmado`)
        .set(turnoDoc({ id: 't_confirmado', estado: 'confirmado' })),
    ),
  )

  // ------------------------------------------------------------------ //
  // Reserva online: el flujo que estaba 100% roto
  // ------------------------------------------------------------------ //
  console.log('\nRESERVA ONLINE (jugador)')

  await comprobar('el jugador reserva un turno disponible', () =>
    assertSucceeds(
      db(JUGADOR)
        .doc(`${TURNOS}/t1`)
        .update(
          bloqueoDoc({
            id: 't1',
            organizadorUid: JUGADOR,
            organizadorNombre: 'Jugador',
          }),
        ),
    ),
  )

  await comprobar('el jugador NO puede reservar un turno ya tomado', () =>
    assertFails(
      db(TERCERO)
        .doc(`${TURNOS}/t2`)
        .update(
          bloqueoDoc({
            id: 't2',
            organizadorUid: TERCERO,
          }),
        ),
    ),
  )

  await comprobar('no se puede reservar sin comprobante pendiente', () =>
    assertFails(
      db(JUGADOR)
        .doc(`${TURNOS}/t1`)
        .update(
          bloqueoDoc({
            id: 't1',
            organizadorUid: JUGADOR,
            comprobantePendiente: false,
          }),
        ),
    ),
  )

  await comprobar('no se puede reservar sin plazo de bloqueo', () =>
    assertFails(
      db(JUGADOR)
        .doc(`${TURNOS}/t1`)
        .update(
          bloqueoDoc({
            id: 't1',
            organizadorUid: JUGADOR,
            bloqueadoHasta: null,
          }),
        ),
    ),
  )

  await comprobar('no se puede reservar en nombre de otro', () =>
    assertFails(
      db(TERCERO)
        .doc(`${TURNOS}/t1`)
        .update(
          bloqueoDoc({
            id: 't1',
            organizadorUid: JUGADOR,
          }),
        ),
    ),
  )

  await comprobar('no se puede borrar un turno', () =>
    assertFails(db(DUENO).doc(`${TURNOS}/t1`).delete()),
  )

  // ------------------------------------------------------------------ //
  // Comprobantes
  // ------------------------------------------------------------------ //
  console.log('\nCOMPROBANTES')

  await comprobar('el jugador sube su comprobante sobre su turno', () =>
    assertSucceeds(db(JUGADOR).doc(`${COMPROBANTES}/t1`).set(comprobanteDoc())),
  )

  // t2 esta reservado por el JUGADOR: TERCERO no debe poder colgarse de el.
await comprobar('el jugador NO sube comprobante sobre el turno de otro', () =>
    assertFails(
      db(TERCERO)
        .doc(`${COMPROBANTES}/t2`)
        .set(comprobanteDoc({ turnoId: 't2', organizadorUid: TERCERO })),
    ),
  )

await comprobar('NO se sube comprobante sobre un turno todavia libre', () =>
    assertFails(
      db(TERCERO)
        .doc(`${COMPROBANTES}/t1`)
        .set(comprobanteDoc({ turnoId: 't1', organizadorUid: TERCERO })),
    ),
  )

  await comprobar('no se puede subir un comprobante ya verificado', () =>
    assertFails(
      db(JUGADOR)
        .doc(`${COMPROBANTES}/t2`)
        .set(comprobanteDoc({ turnoId: 't2', verificado: true })),
    ),
  )

  await comprobar('el jugador lee su propio comprobante', () =>
    assertSucceeds(db(JUGADOR).doc(`${COMPROBANTES}/t1`).get()),
  )

  await comprobar('el jugador NO lee el comprobante de otro', () =>
    assertFails(db(TERCERO).doc(`${COMPROBANTES}/t1`).get()),
  )

  await comprobar('el dueno lee el comprobante de su predio', () =>
    assertSucceeds(db(DUENO).doc(`${COMPROBANTES}/t1`).get()),
  )

  await comprobar('nadie borra un comprobante', () =>
    assertFails(db(DUENO).doc(`${COMPROBANTES}/t1`).delete()),
  )

  // ------------------------------------------------------------------ //
  // La reserva real: turno + comprobante en una sola transaccion
  // ------------------------------------------------------------------ //
  // Este es el caso que `turnoEsPropio` puede romper. `reservarTurno` escribe
  // el turno (poniendo `organizadorUid`) y el comprobante juntos, asi que la
  // regla del comprobante mira el turno con un `get()` a un documento que el
  // mismo commit todavia no habia escrito. Si las rules no ven el write
  // pendiente, TODA reserva online falla. Por eso se prueba la transaccion
  // entera y no los dos `set` sueltos de arriba.
  console.log('\nRESERVA COMPLETA (transaccion)')

  await comprobar('reserva y comprobante en una sola transaccion', () =>
    assertSucceeds(
      new Promise<void>((resolve, reject) => {
        const fs = env.authenticatedContext(JUGADOR).firestore() as unknown as {
          doc(path: string): unknown
          runTransaction(
            fn: (tx: {
              doc(path: string): unknown
              set(ref: unknown, data: unknown): unknown
              update(ref: unknown, data: unknown): unknown
            }) => Promise<void>,
          ): Promise<void>
        }
        fs.runTransaction(async (tx) => {
          const turnoRef = fs.doc(`${TURNOS}/t_tx`)
          const compRef = fs.doc(`${COMPROBANTES}/t_tx`)
          tx.update(turnoRef, bloqueoDoc({
            id: 't_tx',
            organizadorUid: JUGADOR,
            organizadorNombre: 'Jugador',
          }))
          tx.set(compRef, comprobanteDoc({ turnoId: 't_tx', organizadorUid: JUGADOR }))
        })
          .then(() => resolve())
          .catch(reject)
      }),
    ),
  )

  await comprobar('el turno quedo reservado con su comprobante', async () => {
    const turno = (await db(DUENO).doc(`${TURNOS}/t_tx`).get()) as {
      data(): { estado: string; organizadorUid: string }
    }
    if (turno.data().estado !== 'bloqueado_temporal') {
      throw new Error(`estado=${turno.data().estado}`)
    }
    if (turno.data().organizadorUid !== JUGADOR) {
      throw new Error(`organizadorUid=${turno.data().organizadorUid}`)
    }
  })

  await comprobar('otro jugador NO puede completar la misma reserva', () =>
    assertFails(
      new Promise<void>((resolve, reject) => {
        const fs = env.authenticatedContext(TERCERO).firestore() as unknown as {
          doc(path: string): unknown
          runTransaction(
            fn: (tx: {
              doc(path: string): unknown
              set(ref: unknown, data: unknown): unknown
              update(ref: unknown, data: unknown): unknown
            }) => Promise<void>,
          ): Promise<void>
        }
        fs.runTransaction(async (tx) => {
          const turnoRef = fs.doc(`${TURNOS}/t_tx`)
          const compRef = fs.doc(`${COMPROBANTES}/t_tx`)
          tx.update(turnoRef, bloqueoDoc({
            id: 't_tx',
            organizadorUid: TERCERO,
          }))
          tx.set(compRef, comprobanteDoc({ turnoId: 't_tx', organizadorUid: TERCERO }))
        })
          .then(() => resolve())
          .catch(reject)
      }),
    ),
  )

  // ------------------------------------------------------------------ //
  // Cancelacion
  // ------------------------------------------------------------------ //
  console.log('\nCANCELACION')

  await comprobar('el jugador cancela su propia reserva confirmada', () =>
    assertSucceeds(
      db(JUGADOR)
        .doc(`${TURNOS}/t2`)
        .update(turnoDoc({ id: 't2', estado: 'cancelado', organizadorUid: JUGADOR })),
    ),
  )

  await comprobar('el jugador NO cancela la reserva de otro', () =>
    assertFails(
      db(TERCERO)
        .doc(`${TURNOS}/t2`)
        .update(turnoDoc({ id: 't2', estado: 'cancelado', organizadorUid: TERCERO })),
    ),
  )

  // ------------------------------------------------------------------ //
  // Alertas "Falta 1"
  // ------------------------------------------------------------------ //
  console.log('\nALERTAS FALTA 1')

  await comprobar('el organizador del turno confirmado activa el radar', () =>
    assertSucceeds(
      db(TERCERO).doc(`${ALERTAS}/falta1_t3`).set(alertaDoc({ turnoId: 't3', creadoPorUid: TERCERO })),
    ),
  )

await comprobar('un tercero NO activa el radar de un turno ajeno', () =>
    assertFails(
      db(JUGADOR)
        .doc(`${ALERTAS}/falta1_t3`)
        .set(alertaDoc({ id: 'falta1_t3', turnoId: 't3', creadoPorUid: JUGADOR })),
    ),
  )

await comprobar('NO se activa el radar sobre un turno ajeno inexistente', () =>
    assertFails(
      db(TERCERO)
        .doc(`${ALERTAS}/falta1_fantasma`)
        .set(alertaDoc({ id: 'falta1_fantasma', turnoId: 't_no_existe', creadoPorUid: TERCERO })),
    ),
  )

await comprobar('NO se activa el radar sobre un turno sin confirmar', () =>
    assertFails(
      db(JUGADOR)
        .doc(`${ALERTAS}/falta1_t1`)
        .set(alertaDoc({ id: 'falta1_t1', turnoId: 't1', creadoPorUid: JUGADOR })),
    ),
  )

  await comprobar('NO se activa el radar con confirmados > 0', () =>
    assertFails(
      db(TERCERO)
        .doc(`${ALERTAS}/falta1_t4`)
        .set(alertaDoc({ id: 'falta1_t4', turnoId: 't3', confirmados: 1, creadoPorUid: TERCERO })),
    ),
  )

  // El update de alertas congela la geografia de la alerta: si un jugador
  // pudiera mover su "falta 1", el dueno veria el aviso en otro barrio.
  await comprobar('se puede actualizar la cantidad de confirmados', () =>
    assertSucceeds(
      db(TERCERO).doc(`${ALERTAS}/falta1_t3`).update({ confirmados: 1 }),
    ),
  )

  await comprobar('NO se puede mover la geografia de una alerta', () =>
    assertFails(
      db(TERCERO)
        .doc(`${ALERTAS}/falta1_t3`)
        .update({ geo: aGeoIndex({ lat: -34.9, lng: -58.6 }) }),
    ),
  )

  await comprobar('NO se puede cambiar la hora de una alerta', () =>
    assertFails(db(TERCERO).doc(`${ALERTAS}/falta1_t3`).update({ horaInicio: '23:00' })),
  )

  await comprobar('NO se puede rebajar la cantidad de confirmados', () =>
    assertFails(db(TERCERO).doc(`${ALERTAS}/falta1_t3`).update({ confirmados: 0 })),
  )

  await env.cleanup()

  console.log(
    `\n${fallos === 0 ? '✅ Todas las reglas de turnos se comportaron como se espera.' : `❌ ${fallos} falla(s)`}\n`,
  )
  process.exit(fallos === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})