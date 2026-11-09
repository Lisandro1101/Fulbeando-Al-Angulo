import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import type { Comprobante, EstadoTurno, Franja, Predio, Turno, TarifasDiferenciadas } from '@/domain'
import {
  MINUTOS_A_MS,
  MINUTOS_BLOQUEO_TEMPORAL,
  bloqueoVencio,
  errorEnFranjas,
  esDuenoDelPredio,
  puedeCancelarTurno,
  puedeSolicitarTurno,
  puedeValidarTurno,
  calcularMontoSena,
  calcularPrecioHoraCancha,
  precioDeFranja,
  turnoId,
} from '@/domain'
import { COLECCIONES } from '@/core/config'
import { db } from '@/core/firebase'
import { aMillis, auditoriaInicial, auditoriaUpdate, ts, type Escritura } from '@/core/firestore'
import { aGeoIndex } from '@/core/geo'
import type { Actor } from '@/domain/turno.reglas'
import { esFeriado } from '@/core/tiempo'

const col = () => collection(db, COLECCIONES.turnos)
export const ref = (id: string) => doc(db, COLECCIONES.turnos, id)
const refComprobante = (turnoDocId: string) =>
  doc(db, COLECCIONES.comprobantes, turnoDocId)

export class TurnoNoDisponibleError extends Error {
  constructor(turnoDocId: string) {
    super(`El turno ${turnoDocId} ya no esta disponible.`)
    this.name = 'TurnoNoDisponibleError'
  }
}

export class SinComprobanteError extends Error {
  constructor() {
    super('La solicitud no es valida sin comprobante adjunto (regla 6.1).')
    this.name = 'SinComprobanteError'
  }
}

export class TransaccionInvalidaError extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'TransaccionInvalidaError'
  }
}

/* ------------------------------------------------------------------ */
/* Grilla y lecturas                                                  */
/* ------------------------------------------------------------------ */

export const obtenerTurno = async (id: string): Promise<Turno | null> => {
  const snap = await getDoc(ref(id))
  return snap.exists() ? (snap.data() as Turno) : null
}

/** Grilla del dia para el semaforo del dueno de predio. */
export const listarTurnosDelDia = async (predioId: string, fecha: string): Promise<Turno[]> => {
  const snap = await getDocs(query(col(), where('predioId', '==', predioId), where('fecha', '==', fecha)))
  return snap.docs.map((d) => d.data() as Turno).filter((t) => t.deletedAt === null)
}

export const listarTurnosDisponibles = async (
  predioId: string,
  fecha: string,
): Promise<Turno[]> => {
  const turnos = await listarTurnosDelDia(predioId, fecha)
  const ahoraMs = Date.now()
  return turnos.filter((t) => t.estado === 'disponible' || bloqueoVencio(t, ahoraMs))
}

/** Solicitudes esperando comprobante: amarillo en el semaforo del dueno. */
export const listarTurnosPendientesDeValidacion = async (
  predioId: string,
): Promise<Turno[]> => {
  const snap = await getDocs(
    query(col(), where('predioId', '==', predioId), where('estado', '==', 'bloqueado_temporal')),
  )
  return snap.docs
    .map((d) => d.data() as Turno)
    .filter((t) => t.deletedAt === null)
    .sort((a, b) => `${a.fecha}${a.horaInicio}`.localeCompare(`${b.fecha}${b.horaInicio}`))
}

/** Turnos del organizador para "Mis Proximos Partidos". */
export const listarTurnosDelOrganizador = async (
  organizadorUid: string,
  desdeFecha: string,
): Promise<Turno[]> => {
  const snap = await getDocs(
    query(col(), where('organizadorUid', '==', organizadorUid), where('fecha', '>=', desdeFecha)),
  )
  return snap.docs.map((d) => d.data() as Turno).filter((t) => t.deletedAt === null)
}

/** Una sola query para toda la grilla semanal que se ofrece en la reserva. */
export const listarTurnosEnRango = async (
  predioId: string,
  desde: string,
  hasta: string,
): Promise<Turno[]> => {
  const snap = await getDocs(
    query(
      col(),
      where('predioId', '==', predioId),
      where('fecha', '>=', desde),
      where('fecha', '<=', hasta),
    ),
  )
  return snap.docs.map((d) => d.data() as Turno).filter((t) => t.deletedAt === null)
}

/* ------------------------------------------------------------------ */
/* Suscripciones en tiempo real (onSnapshot)                          */
/* ------------------------------------------------------------------ */

/**
 * Escucha en tiempo real el estado de un turno puntual.
 * Ideal para la pantalla del jugador esperando aprobación de la seña.
 */
export const suscribirTurno = (
  id: string,
  callback: (turno: Turno | null) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  return onSnapshot(
    ref(id),
    (snap) => {
      callback(snap.exists() ? (snap.data() as Turno) : null)
    },
    (err) => {
      console.error(`Error en suscripción de turno ${id}:`, err)
      onError?.(err)
    },
  )
}

/**
 * Escucha en tiempo real los turnos del día para un predio.
 * La grilla del dueño se actualiza inmediatamente sin tocar "Actualizar".
 */
export const suscribirTurnosDelDia = (
  predioId: string,
  fecha: string,
  callback: (turnos: Turno[]) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  const q = query(col(), where('predioId', '==', predioId), where('fecha', '==', fecha))
  return onSnapshot(
    q,
    (snap) => {
      const turnos = snap.docs.map((d) => d.data() as Turno).filter((t) => t.deletedAt === null)
      callback(turnos)
    },
    (err) => {
      console.error(`Error en suscripción de turnos del día (${predioId}, ${fecha}):`, err)
      onError?.(err)
    },
  )
}

/**
 * Escucha en tiempo real las solicitudes que esperan validación del dueño.
 * En cuanto el jugador envía la seña, aparece en la cola del dueño al instante.
 */
export const suscribirTurnosPendientesDeValidacion = (
  predioId: string,
  callback: (pendientes: Turno[]) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  const q = query(
    col(),
    where('predioId', '==', predioId),
    where('estado', '==', 'bloqueado_temporal'),
  )
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as Turno)
        .filter((t) => t.deletedAt === null)
        .sort((a, b) => `${a.fecha}${a.horaInicio}`.localeCompare(`${b.fecha}${b.horaInicio}`))
      callback(list)
    },
    (err) => {
      console.error(`Error en suscripción de turnos pendientes (${predioId}):`, err)
      onError?.(err)
    },
  )
}

/**
 * Escucha en tiempo real los turnos de un organizador (Mis Reservas).
 */
export const suscribirTurnosDelOrganizador = (
  organizadorUid: string,
  desdeFecha: string,
  callback: (turnos: Turno[]) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  const q = query(
    col(),
    where('organizadorUid', '==', organizadorUid),
    where('fecha', '>=', desdeFecha),
  )
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Turno).filter((t) => t.deletedAt === null)
      callback(list)
    },
    (err) => {
      console.error(`Error en suscripción de turnos del organizador (${organizadorUid}):`, err)
      onError?.(err)
    },
  )
}

/**
 * Escucha en tiempo real los turnos de una semana para un predio (selector de franja).
 */
export const suscribirTurnosEnRango = (
  predioId: string,
  desde: string,
  hasta: string,
  callback: (turnos: Turno[]) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  const q = query(
    col(),
    where('predioId', '==', predioId),
    where('fecha', '>=', desde),
    where('fecha', '<=', hasta),
  )
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Turno).filter((t) => t.deletedAt === null)
      callback(list)
    },
    (err) => {
      console.error(`Error en suscripción de turnos en rango (${predioId}):`, err)
      onError?.(err)
    },
  )
}


/* ------------------------------------------------------------------ */
/* Alta de grilla (carga del dueno de predio)                         */
/* ------------------------------------------------------------------ */

export interface AltaTurno {
  predioId: string
  canchaId: string
  fecha: string
  horaInicio: string
  horaFin: string
  precioTotal: number
  montoSena: number
  origen: Turno['origen']
  geo: ReturnType<typeof aGeoIndex>
}

/** Firestore admite 500 escrituras por batch; se deja margen para el commit. */
export const MAX_TURNOS_POR_GRILLA = 450

/**
 * Genera la grilla de un dia para todas las canchas indicadas. El ID es
 * deterministico (`predio~cancha~fechaThora`), asi que volver a correr esto no
 * duplica turnos ni pisa reservas existentes: solo crea lo que falta.
 */
export const generarGrillaDelDia = async (
  canchas: Array<{ id: string; precioHora: number; tarifas?: TarifasDiferenciadas }>,
  fecha: string,
  franjas: readonly Franja[],
  predio: Pick<Predio, 'id' | 'geo' | 'cobro'>,
): Promise<number> => {
  const problema = errorEnFranjas(franjas)
  if (problema) throw new TransaccionInvalidaError(problema)
  if (canchas.length === 0) throw new TransaccionInvalidaError('El predio no tiene canchas activas.')

  const geo = aGeoIndex({ lat: predio.geo.lat, lng: predio.geo.lng })

  // Una sola lectura del dia en vez de un getDoc por turno candidato.
  const existentes = new Set(
    (await listarTurnosDelDia(predio.id, fecha)).map((t) => `${t.canchaId}~${t.horaInicio}`),
  )

  const faltantes = canchas.flatMap((cancha) =>
    franjas
      .filter((f) => !existentes.has(`${cancha.id}~${f.horaInicio}`))
      .map((slot) => ({ cancha, slot })),
  )

  if (faltantes.length === 0) return 0
  if (faltantes.length > MAX_TURNOS_POR_GRILLA) {
    throw new TransaccionInvalidaError(
      `Son ${faltantes.length} turnos y Firestore admite ${MAX_TURNOS_POR_GRILLA} por operacion. Carga menos canchas o menos franjas por dia.`,
    )
  }

  const batch = writeBatch(db)
  for (const { cancha, slot } of faltantes) {
    const id = turnoId({
      predioId: predio.id,
      canchaId: cancha.id,
      fecha,
      horaInicio: slot.horaInicio,
    })
    batch.set(ref(id), {
      id,
      predioId: predio.id,
      canchaId: cancha.id,
      fecha,
      horaInicio: slot.horaInicio,
      horaFin: slot.horaFin,
      estado: 'disponible',
      origen: 'carga_manual_dueno',
      precioTotal: precioDeFranja(calcularPrecioHoraCancha(cancha, fecha, slot.horaInicio), slot),
      montoSena: calcularMontoSena(predio.cobro, precioDeFranja(calcularPrecioHoraCancha(cancha, fecha, slot.horaInicio), slot)),
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
      ...auditoriaInicial(),
    } satisfies Escritura<Turno>)
  }
  await batch.commit()
  return faltantes.length
}

export interface OpcionesGrillaMasiva {
  excluirFeriados?: boolean
  onProgreso?: (creados: number, totalEstimado: number) => void
}

/**
 * Genera la grilla para múltiples fechas. Agrupa en lotes para no superar
 * el límite de 500 operaciones de Firestore.
 * Optimizado con una sola lectura en rango (evita N roundtrips en rangos largos de meses).
 */
export const generarGrillaMasiva = async (
  canchas: Array<{ id: string; precioHora: number; tarifas?: TarifasDiferenciadas }>,
  fechas: string[],
  franjas: readonly Franja[],
  predio: Pick<Predio, 'id' | 'geo' | 'cobro'>,
  opciones?: OpcionesGrillaMasiva,
): Promise<number> => {
  const problema = errorEnFranjas(franjas)
  if (problema) throw new TransaccionInvalidaError(problema)
  if (canchas.length === 0) throw new TransaccionInvalidaError('El predio no tiene canchas activas.')
  if (fechas.length === 0) return 0

  const fechasValidas = opciones?.excluirFeriados
    ? fechas.filter((f) => !esFeriado(f))
    : fechas

  if (fechasValidas.length === 0) return 0

  const geo = aGeoIndex({ lat: predio.geo.lat, lng: predio.geo.lng })
  let totalCreados = 0

  // Consulta por rango en una sola query optimizada
  const fechasOrdenadas = [...fechasValidas].sort()
  const fechaMin = fechasOrdenadas[0]!
  const fechaMax = fechasOrdenadas[fechasOrdenadas.length - 1]!

  const turnosExistentes = await listarTurnosEnRango(predio.id, fechaMin, fechaMax)
  const existentes = new Set(
    turnosExistentes.map((t) => `${t.fecha}~${t.canchaId}~${t.horaInicio}`),
  )

  const totalEstimado = fechasValidas.length * canchas.length * franjas.length

  let batch = writeBatch(db)
  let operacionesEnBatch = 0
  const procesarBatch = async () => {
    if (operacionesEnBatch > 0) {
      await batch.commit()
      batch = writeBatch(db)
      operacionesEnBatch = 0
    }
  }

  for (const fecha of fechasValidas) {
    const faltantes = canchas.flatMap((cancha) =>
      franjas
        .filter((f) => !existentes.has(`${fecha}~${cancha.id}~${f.horaInicio}`))
        .map((slot) => ({ cancha, slot })),
    )

    for (const { cancha, slot } of faltantes) {
      const id = turnoId({
        predioId: predio.id,
        canchaId: cancha.id,
        fecha,
        horaInicio: slot.horaInicio,
      })
      batch.set(ref(id), {
        id,
        predioId: predio.id,
        canchaId: cancha.id,
        fecha,
        horaInicio: slot.horaInicio,
        horaFin: slot.horaFin,
        estado: 'disponible',
        origen: 'carga_manual_dueno',
        precioTotal: precioDeFranja(calcularPrecioHoraCancha(cancha, fecha, slot.horaInicio), slot),
        montoSena: calcularMontoSena(predio.cobro, precioDeFranja(calcularPrecioHoraCancha(cancha, fecha, slot.horaInicio), slot)),
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
        ...auditoriaInicial(),
      } satisfies Escritura<Turno>)

      operacionesEnBatch++
      totalCreados++
      if (operacionesEnBatch >= MAX_TURNOS_POR_GRILLA) {
        await procesarBatch()
        opciones?.onProgreso?.(totalCreados, totalEstimado)
      }
    }
  }

  await procesarBatch()
  opciones?.onProgreso?.(totalCreados, totalCreados)
  return totalCreados
}

/**
 * Bloquea masivamente todos los turnos disponibles de una fecha para un predio (ej. feriado o cierre extraordinario).
 * Preserva turnos ya reservados o con comprobante pendiente.
 */
export const bloquearTurnosDeFecha = async (
  predioId: string,
  fecha: string,
  motivo = 'feriado',
): Promise<number> => {
  const turnos = await listarTurnosDelDia(predioId, fecha)
  const disponibles = turnos.filter((t) => t.estado === 'disponible')
  if (disponibles.length === 0) return 0

  let batch = writeBatch(db)
  let operaciones = 0
  let totalBloqueados = 0

  for (const t of disponibles) {
    batch.update(ref(t.id), {
      estado: 'cancelado',
      origen: 'bloqueo_manual_dueno',
      canceladoPor: 'dueno',
      motivoRechazo: motivo,
      ...auditoriaUpdate(),
    })
    operaciones++
    totalBloqueados++
    if (operaciones >= MAX_TURNOS_POR_GRILLA) {
      await batch.commit()
      batch = writeBatch(db)
      operaciones = 0
    }
  }
  if (operaciones > 0) {
    await batch.commit()
  }
  return totalBloqueados
}

/**
 * Reactiva los turnos que fueron bloqueados manualmente por el dueño en una fecha dada.
 */
export const desbloquearTurnosDeFecha = async (
  predioId: string,
  fecha: string,
): Promise<number> => {
  const turnos = await listarTurnosDelDia(predioId, fecha)
  const bloqueados = turnos.filter(
    (t) => t.estado === 'cancelado' && t.origen === 'bloqueo_manual_dueno' && t.canceladoPor === 'dueno',
  )
  if (bloqueados.length === 0) return 0

  let batch = writeBatch(db)
  let operaciones = 0
  let totalDesbloqueados = 0

  for (const t of bloqueados) {
    batch.update(ref(t.id), {
      estado: 'disponible',
      origen: 'carga_manual_dueno',
      canceladoPor: null,
      motivoRechazo: null,
      ...auditoriaUpdate(),
    })
    operaciones++
    totalDesbloqueados++
    if (operaciones >= MAX_TURNOS_POR_GRILLA) {
      await batch.commit()
      batch = writeBatch(db)
      operaciones = 0
    }
  }
  if (operaciones > 0) {
    await batch.commit()
  }
  return totalDesbloqueados
}


/**
 * Bloqueo manual por turnos tomados fuera de la app (WhatsApp / mostrador).
 * `cancelado` es el unico estado del PRD que representa "no disponible" y
 * `origen` queda como trazabilidad; `motivoRechazo` es solo para comprobantes.
 */
export const bloquearManualmente = async (turnoDocId: string): Promise<void> => {
  await updateDoc(ref(turnoDocId), {
    estado: 'cancelado',
    origen: 'bloqueo_manual_dueno',
    canceladoPor: 'dueno',
    motivoRechazo: null,
    bloqueadoHasta: null,
    ...auditoriaUpdate(),
  })
}

/** Reabre un turno tomado por fuera para que vuelva a ofrecerse. */
export const liberarTurno = async (turnoDocId: string): Promise<void> => {
  await updateDoc(ref(turnoDocId), {
    estado: 'disponible',
    origen: 'carga_manual_dueno',
    canceladoPor: null,
    motivoRechazo: null,
    bloqueadoHasta: null,
    ...auditoriaUpdate(),
  })
}

/* ------------------------------------------------------------------ */
/* Reserva por comprobante manual (regla 6.1)                          */
/* ------------------------------------------------------------------ */

export interface SolicitarTurnoParams {
  predioId: string
  canchaId: string
  fecha: string
  horaInicio: string
  horaFin: string
  precioTotal: number
  montoSena: number
  alias: string
  geo: ReturnType<typeof aGeoIndex>
  organizador: { uid: string; nombre: string; telefono: string | null }
  comprobante: { storagePath: string; mimeType: string; sizeBytes: number }
  partidoId?: number | null
}

/**
 * Regla 6.1: el turno pasa a `bloqueado_temporal` por 15 minutos mientras el
 * dueno revisa el comprobante. Vencido el plazo se notifica al dueno; la
 * reserva no se cancela sola.
 */
export const solicitarTurno = async (params: SolicitarTurnoParams): Promise<string> => {
  if (!params.comprobante.storagePath || params.comprobante.sizeBytes <= 0) {
    throw new SinComprobanteError()
  }

  const id = turnoId(params)
  const limite = ts(new Date(Date.now() + MINUTOS_A_MS(MINUTOS_BLOQUEO_TEMPORAL)))

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(id))
    if (snap.exists()) {
      const actual = snap.data() as Turno
      if (!puedeSolicitarTurno(actual)) throw new TurnoNoDisponibleError(id)
    }

    const turno: Escritura<Turno> = {
      id,
      predioId: params.predioId,
      canchaId: params.canchaId,
      fecha: params.fecha,
      horaInicio: params.horaInicio,
      horaFin: params.horaFin,
      estado: 'bloqueado_temporal',
      origen: 'reserva_online',
      precioTotal: params.precioTotal,
      montoSena: Math.min(params.montoSena, params.precioTotal),
      organizadorUid: params.organizador.uid,
      organizadorNombre: params.organizador.nombre,
      organizadorTelefono: params.organizador.telefono,
      comprobantePendiente: true,
      motivoRechazo: null,
      bloqueadoHasta: limite,
      expiracionNotificada: false,
      canceladoPor: null,
      geo: params.geo,
      partidoId: params.partidoId ?? null,
      ...auditoriaInicial(),
    }

    const comprobante: Comprobante = {
      turnoId: id,
      organizadorUid: params.organizador.uid,
      storagePath: params.comprobante.storagePath,
      mimeType: params.comprobante.mimeType,
      sizeBytes: params.comprobante.sizeBytes,
      alias: params.alias,
      monto: Math.min(params.montoSena, params.precioTotal),
      subidoAt: ts(new Date()),
      revisadoPor: null,
      revisadoAt: null,
      verificado: false,
      motivoRechazo: null,
    }

    tx.set(ref(id), turno)
    tx.set(refComprobante(id), comprobante)
  })

  return id
}

/** Aprobacion con un clic del dueno de predio (criterio de exito del MVP). */
export const aprobarTurno = async (turnoDocId: string, actor: Actor): Promise<void> => {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(turnoDocId))
    if (!snap.exists()) throw new TransaccionInvalidaError('El turno no existe.')
    const turno = snap.data() as Turno
    if (!puedeValidarTurno(actor, turno)) {
      throw new TransaccionInvalidaError('No podes validar este turno.')
    }

    tx.update(ref(turnoDocId), {
      estado: 'confirmado',
      bloqueadoHasta: null,
      comprobantePendiente: false,
      ...auditoriaUpdate(),
    })
    tx.update(refComprobante(turnoDocId), {
      revisadoPor: actor.uid,
      revisadoAt: ts(new Date()),
      verificado: true,
      motivoRechazo: null,
    })
  })
}

export const rechazarTurno = async (
  turnoDocId: string,
  actor: Actor,
  motivo: string,
): Promise<void> => {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(turnoDocId))
    if (!snap.exists()) throw new TransaccionInvalidaError('El turno no existe.')
    const turno = snap.data() as Turno
    if (!puedeValidarTurno(actor, turno)) {
      throw new TransaccionInvalidaError('No podes validar este turno.')
    }

    tx.update(ref(turnoDocId), {
      estado: 'disponible',
      bloqueadoHasta: null,
      comprobantePendiente: false,
      organizadorUid: null,
      organizadorNombre: null,
      organizadorTelefono: null,
      motivoRechazo: motivo,
      ...auditoriaUpdate(),
    })
    tx.update(refComprobante(turnoDocId), {
      revisadoPor: actor.uid,
      revisadoAt: ts(new Date()),
      verificado: false,
      motivoRechazo: motivo,
    })
  })
}

export const cancelarTurno = async (
  turnoDocId: string,
  actor: Actor,
  motivoCancelacion: Turno['canceladoPor'],
): Promise<void> => {
  const snap = await getDoc(ref(turnoDocId))
  if (!snap.exists()) throw new TransaccionInvalidaError('El turno no existe.')
  const turno = snap.data() as Turno
  if (!puedeCancelarTurno(actor, turno)) {
    throw new TransaccionInvalidaError('No podes cancelar este turno.')
  }

  // Cancelar del lado del predio libera la franja: vuelve a `disponible`.
  // Cancelar del organizador la deja `cancelada` para preservar el historial.
  const canceladoPorElDueno = motivoCancelacion === 'dueno' && esDuenoDelPredio(actor, turno.predioId)
  if (canceladoPorElDueno) {
    await updateDoc(ref(turnoDocId), {
      estado: 'disponible',
      bloqueadoHasta: null,
      organizadorUid: null,
      organizadorNombre: null,
      organizadorTelefono: null,
      comprobantePendiente: false,
      canceladoPor: 'dueno',
      ...auditoriaUpdate(),
    })
    return
  }

  await updateDoc(ref(turnoDocId), {
    estado: 'cancelado',
    canceladoPor: motivoCancelacion,
    bloqueadoHasta: null,
    ...auditoriaUpdate(),
  })
}

/**
 * Vencimiento de bloqueos temporales: libera el turno y marca
 * `expiracionNotificada` para que se notifique al dueno (nunca se cancela solo).
 */
export const liberarBloqueosVencidos = async (): Promise<string[]> => {
  const snap = await getDocs(query(col(), where('estado', '==', 'bloqueado_temporal')))
  const ahora = Date.now()
  const vencidos = snap.docs
    .map((d) => d.data() as Turno)
    .filter((t) => {
      const ms = aMillis(t.bloqueadoHasta)
      return ms !== null && ms <= ahora
    })

  if (vencidos.length === 0) return []

  const batch = writeBatch(db)
  for (const turno of vencidos) {
    batch.update(ref(turno.id), {
      estado: 'disponible',
      bloqueadoHasta: null,
      organizadorUid: null,
      organizadorNombre: null,
      organizadorTelefono: null,
      comprobantePendiente: false,
      expiracionNotificada: true,
      ...auditoriaUpdate(),
    })
  }
  await batch.commit()
  return vencidos.map((t) => t.id)
}

export const contarTurnosPorEstado = async (estado: EstadoTurno): Promise<number> => {
  const snap = await getDocs(query(col(), where('estado', '==', estado)))
  return snap.size
}

/**
 * Habilitar turno individual desde la grilla del dueño (alta puntual de un horario).
 */
export const habilitarTurnoIndividual = async (
  predio: Pick<Predio, 'id' | 'geo' | 'cobro'>,
  cancha: { id: string; precioHora: number; tarifas?: TarifasDiferenciadas },
  fecha: string,
  horaInicio: string,
  horaFin?: string,
): Promise<Turno> => {
  const [hStr, mStr] = horaInicio.split(':')
  const totalMin = (parseInt(hStr ?? '0', 10) * 60 + parseInt(mStr ?? '0', 10) + 60) % 1440
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  const fin = horaFin ?? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

  const geo = aGeoIndex({ lat: predio.geo.lat, lng: predio.geo.lng })
  const id = turnoId({
    predioId: predio.id,
    canchaId: cancha.id,
    fecha,
    horaInicio,
  })

  const ahora = ts(new Date())
  const turnoData: Escritura<Turno> = {
    id,
    predioId: predio.id,
    canchaId: cancha.id,
    fecha,
    horaInicio,
    horaFin: fin,
    estado: 'disponible',
    origen: 'carga_manual_dueno',
    precioTotal: calcularPrecioHoraCancha(cancha, fecha, horaInicio),
    montoSena: calcularMontoSena(predio.cobro, calcularPrecioHoraCancha(cancha, fecha, horaInicio)),
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
    ...auditoriaInicial(),
  }

  await setDoc(ref(id), turnoData)
  return {
    ...turnoData,
    createdAt: ahora,
    updatedAt: ahora,
    deletedAt: null,
  } as Turno
}

/**
 * Desactiva un turno de la grilla (baja lógica).
 */
export const desactivarTurno = async (turnoDocId: string): Promise<void> => {
  await updateDoc(ref(turnoDocId), {
    deletedAt: ts(new Date()),
    ...auditoriaUpdate(),
  })
}
