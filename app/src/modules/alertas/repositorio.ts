import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import type { Alerta, Postulacion, PosicionBuscada, Turno } from '@/domain'
import { alertaIdDeTurno, estaActiva, puedeActivarRadar, faltanJugadores } from '@/domain'
import type { Actor } from '@/domain/turno.reglas'
import { COLECCIONES, appEnv } from '@/core/config'
import { db } from '@/core/firebase'
import { aMillis, auditoriaInicial, auditoriaUpdate, ts, type Escritura } from '@/core/firestore'
import { prefijosQueCubren, type Punto } from '@/core/geo/geohash'
import { haversineKm } from '@/core/geo/geohash'
import { desdeFechaHora, aFechaISO } from '@/core/tiempo'

const col = () => collection(db, COLECCIONES.alertas)
export const ref = (id: string) => doc(db, COLECCIONES.alertas, id)
const refPostulaciones = (alertaId: string) => collection(db, COLECCIONES.alertas, alertaId, COLECCIONES.postulaciones)
const refPostulacion = (alertaId: string, uid: string) =>
  doc(db, COLECCIONES.alertas, alertaId, COLECCIONES.postulaciones, uid)

export class RadarNoPermitidoError extends Error {
  constructor() {
    super('Solo un usuario con turno confirmado o el dueno del predio puede activar el radar.')
    this.name = 'RadarNoPermitidoError'
  }
}

export class YaHayRadarError extends Error {
  constructor(alertaId: string) {
    super(`Ya existe una alerta activa para este turno: ${alertaId}`)
    this.name = 'YaHayRadarError'
  }
}

/**
 * Regla 6.2: valida permiso antes de escribir. El ID es deterministico por
 * turno, asi que no se puede abrir un radar duplicado para el mismo horario.
 */
export const crearAlerta = async (
  turno: Turno,
  actor: Actor,
  opciones: { cantidadRequeridos?: number; posicionBuscada?: PosicionBuscada; notas?: string | null },
): Promise<string> => {
  if (!puedeActivarRadar(actor, turno)) throw new RadarNoPermitidoError()

  const id = alertaIdDeTurno(turno.id)
  const existente = await getDoc(ref(id))
  if (existente.exists() && estaActiva(existente.data() as Alerta, Date.now())) {
    throw new YaHayRadarError(id)
  }

  const alerta: Escritura<Alerta> = {
    id,
    turnoId: turno.id,
    predioId: turno.predioId,
    canchaId: turno.canchaId,
    fecha: turno.fecha,
    horaInicio: turno.horaInicio,
    horaFin: turno.horaFin,
    geo: turno.geo,
    cantidadRequeridos: Math.max(1, opciones.cantidadRequeridos ?? 1),
    posicionBuscada: opciones.posicionBuscada ?? 'cualquiera',
    notas: opciones.notas ?? null,
    creadoPorUid: actor.uid,
    estado: 'activa',
    confirmados: 0,
    expiraEn: ts(desdeFechaHora(turno.fecha, turno.horaInicio)),
    ...auditoriaInicial(),
  }

  await setDoc(ref(id), alerta)
  return id
}

export const obtenerAlerta = async (id: string): Promise<Alerta | null> => {
  const snap = await getDoc(ref(id))
  return snap.exists() ? (snap.data() as Alerta) : null
}

export const obtenerAlertaDeTurno = (turnoId: string): Promise<Alerta | null> =>
  obtenerAlerta(alertaIdDeTurno(turnoId))

/** "Radar de Emergencia": partidos de hoy cerca del jugador, con distancia. */
export const listarAlertasCercanas = async (
  punto: Punto,
  opciones: { radioKm?: number; fecha?: string } = {},
): Promise<Array<Alerta & { distanciaKm: number }>> => {
  const radioKm = opciones.radioKm ?? appEnv().radarRadioKm
  const prefijos = prefijosQueCubren(punto, radioKm, 5)

  const snap = await getDocs(
    query(
      col(),
      where('geo.prefijos', 'array-contains-any', prefijos),
      where('estado', '==', 'activa'),
      where('fecha', '==', opciones.fecha ?? aFechaISO()),
    ),
  )

  const ahoraMs = Date.now()
  return snap.docs
    .map((d) => d.data() as Alerta)
    .filter((a) => estaActiva(a, ahoraMs) && faltanJugadores(a))
    .map((a) => ({ ...a, distanciaKm: haversineKm(punto, a.geo) }))
    .filter((a) => a.distanciaKm <= radioKm)
    .sort((a, b) => a.distanciaKm - b.distanciaKm)
}

export const alertasDeHoy = async (fecha: string): Promise<Alerta[]> => {
  const snap = await getDocs(query(col(), where('fecha', '==', fecha), where('estado', '==', 'activa')))
  return snap.docs.map((d) => d.data() as Alerta).filter((a) => a.deletedAt === null)
}

/* ------------------------------------------------------------------ */
/* Postulaciones de suplentes                                          */
/* ------------------------------------------------------------------ */

export interface PostularseParams {
  uid: string
  nombre: string
  posicion: Postulacion['posicion']
}

/** El jugador se suma como suplente. Idempotente por uid. */
export const postularse = async (alertaId: string, datos: PostularseParams): Promise<void> => {
  const alerta = await obtenerAlerta(alertaId)
  if (!alerta || !estaActiva(alerta, Date.now())) {
    throw new Error('La alerta no esta activa.')
  }
  const yaPostulado = await getDoc(refPostulacion(alertaId, datos.uid))
  if (yaPostulado.exists() && (yaPostulado.data() as Postulacion).estado === 'confirmado') {
    return
  }

  await setDoc(
    refPostulacion(alertaId, datos.uid),
    {
      ...datos,
      estado: 'postulado',
      creadoAt: yaPostulado.exists() ? (yaPostulado.data() as Postulacion).creadoAt : ts(new Date()),
      actualizadoAt: ts(new Date()),
    } satisfies Postulacion,
  )
}

export const renunciarPostulacion = async (alertaId: string, uid: string): Promise<void> => {
  await updateDoc(refPostulacion(alertaId, uid), {
    estado: 'retirado',
    actualizadoAt: ts(new Date()),
  })
}

export const listarPostulaciones = async (alertaId: string): Promise<Postulacion[]> => {
  const snap = await getDocs(refPostulaciones(alertaId))
  return snap.docs.map((d) => d.data() as Postulacion)
}

/** Confirmar un suplente incrementa `confirmados` y cierra el radar si se completa. */
export const confirmarSuplente = async (alertaId: string, uid: string): Promise<void> => {
  await runTransaction(db, async (tx) => {
    const alertaSnap = await tx.get(ref(alertaId))
    const postulacionSnap = await tx.get(refPostulacion(alertaId, uid))
    if (!alertaSnap.exists() || !postulacionSnap.exists()) {
      throw new Error('Alerta o postulacion inexistente.')
    }
    const alerta = alertaSnap.data() as Alerta
    const postulacion = postulacionSnap.data() as Postulacion
    if (postulacion.estado === 'confirmado') return

    const confirmados = alerta.confirmados + 1
    tx.update(refPostulacion(alertaId, uid), {
      estado: 'confirmado',
      actualizadoAt: ts(new Date()),
    })
    tx.update(ref(alertaId), {
      confirmados,
      estado: confirmados >= alerta.cantidadRequeridos ? 'completada' : 'activa',
      ...auditoriaUpdate(),
    })
  })
}

export const rechazarSuplente = async (alertaId: string, uid: string): Promise<void> => {
  await updateDoc(refPostulacion(alertaId, uid), {
    estado: 'rechazado',
    actualizadoAt: ts(new Date()),
  })
}

/** `expirada` cuando arranca el partido (PRD 3). */
export const expirarAlertasVencidas = async (): Promise<string[]> => {
  const snap = await getDocs(query(col(), where('estado', '==', 'activa')))
  const ahora = Date.now()
  const vencidas = snap.docs
    .map((d) => d.data() as Alerta)
    .filter((a) => {
      const ms = aMillis(a.expiraEn)
      return ms !== null && ms <= ahora
    })

  if (vencidas.length === 0) return []
  const batch = writeBatch(db)
  for (const alerta of vencidas) batch.update(ref(alerta.id), { estado: 'expirada', ...auditoriaUpdate() })
  await batch.commit()
  return vencidas.map((a) => a.id)
}

export const listarAlertasCreadasPor = async (uid: string): Promise<Alerta[]> => {
  const snap = await getDocs(query(col(), where('creadoPorUid', '==', uid)))
  return snap.docs.map((d) => d.data() as Alerta).filter((a) => a.deletedAt === null)
}
