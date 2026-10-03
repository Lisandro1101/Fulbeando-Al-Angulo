import type { Auditoria, GeoIndex, Timestamp } from './comun'
import { aMillis } from '@/core/firestore'

/** Estados de turno del PRD. No hay borrado fisico: se resuelve con estados. */
export type EstadoTurno = 'disponible' | 'bloqueado_temporal' | 'confirmado' | 'cancelado'

export type OrigenTurno = 'reserva_online' | 'carga_manual_dueno' | 'bloqueo_manual_dueno'
export type MotivoCancelacion = 'organizador' | 'dueno' | 'sistema'

/** Matiz visual de la grilla semaforo del dueno de predio (PRD 4.4). */
export type SemaforoTurno = 'libre' | 'pendiente' | 'ocupado'

export interface Turno extends Auditoria {
  id: string
  predioId: string
  canchaId: string
  /** ISO date `YYYY-MM-DD`. Ordenable y consulta por rango. */
  fecha: string
  /** `HH:mm` 24 h. */
  horaInicio: string
  horaFin: string
  estado: EstadoTurno
  origen: OrigenTurno
  precioTotal: number
  montoSena: number
  organizadorUid: string | null
  organizadorNombre: string | null
  organizadorTelefono: string | null
  /** True cuando existe un doc en `comprobantes/{turnoId}` sin revisar. */
  comprobantePendiente: boolean
  motivoRechazo: string | null
  /** Expiracion del bloqueo temporal: 15 min (regla 6.1). */
  bloqueadoHasta: Timestamp | null
  /** Marca que al vencer el bloqueo se notifico al dueno (regla 6.1: no se cancela en silencio). */
  expiracionNotificada: boolean
  canceladoPor: MotivoCancelacion | null
  /** Geo del predio denormalizado: el radar consulta alertas, no joins. */
  geo: GeoIndex
}

/** Duracion maxima del bloqueo provisional esperando validacion del comprobante. */
export const MINUTOS_BLOQUEO_TEMPORAL = 15

/** Franja que el dueno configura al abrir la grilla de un dia. */
export interface Franja {
  /** `HH:mm` 24 h. */
  horaInicio: string
  horaFin: string
}

const RE_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/

export const esHoraValida = (hora: string): boolean => RE_HORA.test(hora)

export const minutosDeHora = (hora: string): number => {
  const [h, m] = hora.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export const duracionDeFranja = (f: Franja): number =>
  minutosDeHora(f.horaFin) - minutosDeHora(f.horaInicio)

/** La hora de fin tiene que ser posterior a la de inicio. */
export const franjaValida = (f: Franja): boolean =>
  esHoraValida(f.horaInicio) && esHoraValida(f.horaFin) && duracionDeFranja(f) > 0

/** Dos franjas se pisan si comparten minutos. */
export const franjasSeSolapan = (a: Franja, b: Franja): boolean =>
  minutosDeHora(a.horaInicio) < minutosDeHora(b.horaFin) &&
  minutosDeHora(b.horaInicio) < minutosDeHora(a.horaFin)

/**
 * Valida la grilla completa antes de escribir. Devuelve el motivo del rechazo
 * o `null` si esta lista para generarse, para no dejar turnos a medio crear.
 */
export const errorEnFranjas = (franjas: readonly Franja[]): string | null => {
  if (franjas.length === 0) return 'Agrega al menos una franja.'
  for (const f of franjas) {
    if (!esHoraValida(f.horaInicio) || !esHoraValida(f.horaFin)) {
      return 'Las horas van en formato HH:mm (24 h).'
    }
    if (duracionDeFranja(f) <= 0) return 'La hora de fin debe ser posterior a la de inicio.'
  }
  for (let i = 0; i < franjas.length; i += 1) {
    for (let j = i + 1; j < franjas.length; j += 1) {
      if (franjasSeSolapan(franjas[i]!, franjas[j]!)) {
        return `Las franjas ${franjas[i]!.horaInicio}-${franjas[i]!.horaFin} y ${franjas[j]!.horaInicio}-${franjas[j]!.horaFin} se pisan.`
      }
    }
  }
  return null
}

export const formatearDuracion = (minutos: number): string => {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

/**
 * `cancha.precioHora` es la tarifa por hora; el precio del turno se prorratea
 * por la duracion real de la franja (una hora y media de cancha no se cobra
 * como una hora completa, ni al doble).
 */
export const precioDeFranja = (precioHora: number, f: Franja): number => {
  const minutos = duracionDeFranja(f)
  if (minutos <= 0) return 0
  return Math.round((precioHora * minutos) / 60)
}

/** Build de un ID deterministico de turno: la unicidad la impone Firestore. */
export const turnoId = (p: {
  predioId: string
  canchaId: string
  fecha: string
  horaInicio: string
}): string => `${p.predioId}~${p.canchaId}~${p.fecha}T${p.horaInicio}`

export const estaLibre = (t: Pick<Turno, 'estado'>): boolean => t.estado === 'disponible'

export const estaOcupado = (t: Pick<Turno, 'estado'>): boolean =>
  t.estado === 'confirmado' || t.estado === 'cancelado'

/** El bloqueo vencio si paso la ventana de 15 min. */
export const bloqueoVencio = (
  t: Pick<Turno, 'estado' | 'bloqueadoHasta'>,
  ahoraMs: number,
): boolean => {
  if (t.estado !== 'bloqueado_temporal' || !t.bloqueadoHasta) return false
  const ms = aMillis(t.bloqueadoHasta)
  return ms !== null && ms <= ahoraMs
}

/**
 * El turno vuelve a `disponible` solo cuando el bloqueo temporal expiro. La
 * expiracion notifica al dueno, no cancela la reserva del organizador.
 */
export const estadoEfectivo = (t: Turno, ahoraMs: number): EstadoTurno =>
  bloqueoVencio(t, ahoraMs) ? 'disponible' : t.estado

export const semaforo = (t: Turno, ahoraMs: number): SemaforoTurno => {
  const estado = estadoEfectivo(t, ahoraMs)
  if (estado === 'disponible') return 'libre'
  if (estado === 'bloqueado_temporal') return 'pendiente'
  return 'ocupado'
}

/**
 * Regla 6.1: sin comprobante adjunto la solicitud no es valida.
 * Se valida antes de escribir en Firestore (y las rules lo impiden).
 */
export const tieneComprobanteValido = (c: {
  storagePath: string
  mimeType: string
  sizeBytes: number
}): boolean =>
  c.storagePath.length > 0 &&
  c.mimeType.startsWith('image/') &&
  c.sizeBytes > 0 &&
  c.sizeBytes <= MAX_BYTES_COMPROBANTE

export const MAX_BYTES_COMPROBANTE = 5 * 1024 * 1024

export const MINUTOS_A_MS = (min: number): number => min * 60_000