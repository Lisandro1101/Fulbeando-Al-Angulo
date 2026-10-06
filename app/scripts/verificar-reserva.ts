/**
 * Prueba de integracion del flujo de reserva: corre el CODIGO REAL de la app
 * (`solicitarTurno`) contra el emulador, no fixtures escritos a mano.
 *
 * Los tests de `scripts/test-reglas-turnos.ts` comprueban que las rules
 * permiten o rechazan un caso. Este comprueba otra cosa: que el cliente real
 * produce un documento que las rules reales aceptan. Ese contrato es justo el
 * que se rompio antes (el cliente escribia `organizadorUid`, las rules pedian
 * `jugadorId`) y por eso hay que medirlo en los dos lados.
 *
 * Corre con:  npm run verificar:reserva --prefix app
 * Requiere el emulador de Firestore y Auth levantados.
 */

import { getAuth, signInAnonymously } from 'firebase/auth'
import { doc as docRef, getDoc, getDocs, collection, query, where } from 'firebase/firestore'
import { db, app } from '@/core/firebase'
import { aGeoIndex } from '@/core/geo/index'
import { solicitarTurno, obtenerTurno } from '@/modules/turnos/repositorio'
import { turnoId } from '@/domain'

const PREDIO = 'p_predio_integracion'
const CANCHA = 'c_cancha_1'
const FECHA = '2099-09-15'
const HORA_INI = '20:00'
const HORA_FIN = '21:00'

const PUNTO = { lat: -34.68, lng: -58.4 }

let fallos = 0

async function comprobar(titulo: string, fn: () => unknown): Promise<void> {
  try {
    await fn()
    console.log(`  PASS  ${titulo}`)
  } catch (error) {
    fallos += 1
    const motivo = error instanceof Error ? error.message.split('\n').slice(0, 3).join(' | ') : String(error)
    console.log(`  FAIL  ${titulo}`)
    console.log(`        ${motivo}`)
  }
}

function esperar(millis: number): Promise<void> {
  return new Promise((r) => setTimeout(r, millis))
}

async function main(): Promise<void> {
  // Espera a que el emulador de Auth responda: si se le gana, `signInAnonymously`
  // tira por timeout y el fallo se confunde con un problema de reglas.
  await esperar(1500)

  const cred = await signInAnonymously(getAuth(app))
  const uid = cred.user.uid
  console.log(`\nSesion anonima: ${uid}`)

  // El dueno y el jugador tienen que existir porque las rules leen el rol y el
  // predio para resolver permisos. Se escriben con reglas apagadas via REST,
  // que es la unica via disponible desde el cliente.
  await sembrarBase()

  console.log('\nRESERVA CON EL CODIGO REAL DE LA APP')

  const id = turnoId({ predioId: PREDIO, canchaId: CANCHA, fecha: FECHA, horaInicio: HORA_INI })

  let reservadoPor: string | null = null

  await comprobar('solicitarTurno() acepta la reserva', async () => {
    reservadoPor = await solicitarTurno({
      predioId: PREDIO,
      canchaId: CANCHA,
      fecha: FECHA,
      horaInicio: HORA_INI,
      horaFin: HORA_FIN,
      precioTotal: 12000,
      montoSena: 4000,
      alias: 'Fulbeando CBU',
      geo: aGeoIndex(PUNTO),
      organizador: { uid, nombre: 'Jugador Integracion', telefono: null },
      comprobante: {
        storagePath: `comprobantes/${uid}/${id}/foto.png`,
        mimeType: 'image/png',
        sizeBytes: 120_000,
      },
      partidoId: null,
    })
  })

  await comprobar('devuelve el id deterministico del turno', () => {
    if (reservadoPor !== id) throw new Error(`esperado ${id}, obtenido ${reservadoPor}`)
  })

  await comprobar('el turno queda bloqueado 15 minutos con el organizador', async () => {
    const turno = await obtenerTurno(id)
    if (!turno) throw new Error('el turno no se puede leer')
    if (turno.estado !== 'bloqueado_temporal') throw new Error(`estado=${turno.estado}`)
    if (turno.organizadorUid !== uid) throw new Error(`organizadorUid=${turno.organizadorUid}`)
    if (!turno.bloqueadoHasta) throw new Error('bloqueadoHasta vacio')
    if (!turno.comprobantePendiente) throw new Error('comprobantePendiente=false')
  })

  await comprobar('el comprobante queda con el MISMO campo que usa la regla', async () => {
    const snap = await getDoc(docRef(db, 'comprobantes', id))
    if (!snap.exists()) throw new Error('el comprobante no se escribio')
    const c = snap.data() as Record<string, unknown>
    // Si estos nombres se desincronizan, la reserva vuelve a caer en
    // PERMISSION_DENIED sin que nada falle en el typecheck.
    if (c.organizadorUid !== uid) throw new Error(`organizadorUid=${String(c.organizadorUid)}`)
    if (c.verificado !== false) throw new Error(`verificado=${String(c.verificado)}`)
  })

  await comprobar('el turno aparece en "mis turnos" del organizador', async () => {
    const q = query(collection(db, 'turnos'), where('organizadorUid', '==', uid))
    const docs = await getDocs(q)
    if (docs.size === 0) throw new Error('la query por organizadorUid no encuentra nada')
  })

  await comprobar('reintentar el mismo turno da TurnoNoDisponibleError', async () => {
    try {
      await solicitarTurno({
        predioId: PREDIO,
        canchaId: CANCHA,
        fecha: FECHA,
        horaInicio: HORA_INI,
        horaFin: HORA_FIN,
        precioTotal: 12000,
        montoSena: 4000,
        alias: 'Fulbeando CBU',
        geo: aGeoIndex(PUNTO),
        organizador: { uid, nombre: 'Jugador Integracion', telefono: null },
        comprobante: {
          storagePath: `comprobantes/${uid}/${id}/foto2.png`,
          mimeType: 'image/png',
          sizeBytes: 120_000,
        },
      })
    } catch (e) {
      // Ojo con el patron: `/no est.a disponible/` NO matchea "ya no esta
      // disponible" (la coma implicita pide un caracter de mas).
      const mensaje = e instanceof Error ? e.message : String(e)
      if (/no est[aá] disponible/i.test(mensaje)) return
      throw e
    }
    throw new Error('la segunda reserva deberia haber fallado')
  })

  console.log(`\n${fallos === 0 ? 'Flujo de reserva verificado de punta a punta.' : `${fallos} falla(s)`}\n`)
  process.exit(fallos === 0 ? 0 : 1)
}

/**
 * El dueno, su usuario y un turno libre.
 *
 * Va por REST con `Authorization: Bearer owner`, que es como el emulador de
 * Firestore reconoce las escrituras de administrador (bypasean las rules). Con
 * el token del jugador las escrituras serian rechazadas: un jugador no puede
 * cargar turnos, y justamente eso es lo que se quiere probar mas abajo.
 */
async function sembrarBase(): Promise<void> {
  // Sin fallback a otro proyecto: si `app.options.projectId` viniera vacio, el
  // REST escribiria en un namespace que la app no lee.
  const projectId = (app.options as { projectId?: string }).projectId
  if (!projectId) throw new Error('La app no tiene projectId: revisar VITE_FIREBASE_PROJECT_ID.')
  const host = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
  const base = `http://${host}/v1/projects/${projectId}/databases/(default)/documents`

  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer owner',
  }

  const put = async (path: string, fields: Record<string, unknown>): Promise<void> => {
    const res = await fetch(`${base}/${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields }),
    })
    if (!res.ok) {
      throw new Error(`sembrar ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`)
    }
  }

  const geo = aGeoIndex(PUNTO)

  await put(`usuarios/${DUENO_ID}`, {
    nombre: { stringValue: 'Dueno Integracion' },
    email: { stringValue: 'dueno@integracion.test' },
    rol: { stringValue: 'dueno_predio' },
    estado: { stringValue: 'activo' },
    deletedAt: { nullValue: null },
  })

  await put(`predios/${PREDIO}`, {
    nombre: { stringValue: 'Predio Integracion' },
    duenoUid: { stringValue: DUENO_ID },
    direccion: { stringValue: 'Avenida Test 123' },
    estado: { stringValue: 'activo' },
    deletedAt: { nullValue: null },
  })

  const id = turnoId({ predioId: PREDIO, canchaId: CANCHA, fecha: FECHA, horaInicio: HORA_INI })
  await put(`turnos/${id}`, {
    id: { stringValue: id },
    predioId: { stringValue: PREDIO },
    canchaId: { stringValue: CANCHA },
    fecha: { stringValue: FECHA },
    horaInicio: { stringValue: HORA_INI },
    horaFin: { stringValue: HORA_FIN },
    estado: { stringValue: 'disponible' },
    origen: { stringValue: 'reserva_online' },
    precioTotal: { integerValue: '12000' },
    montoSena: { integerValue: '4000' },
    organizadorUid: { nullValue: null },
    organizadorNombre: { nullValue: null },
    organizadorTelefono: { nullValue: null },
    comprobantePendiente: { booleanValue: false },
    motivoRechazo: { nullValue: null },
    bloqueadoHasta: { nullValue: null },
    expiracionNotificada: { booleanValue: false },
    canceladoPor: { nullValue: null },
    geo: {
      mapValue: {
        fields: {
          lat: { doubleValue: geo.lat },
          lng: { doubleValue: geo.lng },
          prefijo: { stringValue: geo.prefijo },
          prefijos: { arrayValue: { values: geo.prefijos.map((p) => ({ stringValue: p })) } },
        },
      },
    },
    partidoId: { nullValue: null },
    // Nombres de `auditoriaInicial()`: `deletedAt` (no `eliminadoEn`). Con el
    // nombre equivocado `puedeSolicitarTurno` compara `undefined === null`, da
    // false y la reserva se rechaza con "ya no esta disponible".
    deletedAt: { nullValue: null },
    createdAt: { timestampValue: new Date().toISOString() },
    updatedAt: { timestampValue: new Date().toISOString() },
  })
}

const DUENO_ID = 'dueno_integracion_fijo'

main().catch((e) => {
  console.error(e)
  process.exit(1)
})