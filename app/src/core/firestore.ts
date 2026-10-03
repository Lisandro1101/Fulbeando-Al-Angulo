import { Timestamp, serverTimestamp, type FieldValue } from 'firebase/firestore'
import type { Auditoria } from '@/domain'

/** Fecha -> Timestamp de Firestore. */
export const ts = (date: Date): Timestamp => Timestamp.fromDate(date)

/** Marca de tiempo del servidor (no confiable en el cliente). */
export const ahora = (): FieldValue => serverTimestamp()

/**
 * Forma de un documento al escribirse: la auditoria todavia no existe en el
 * cliente, asi que `createdAt` / `updatedAt` pueden ser `serverTimestamp()`.
 */
export type Escritura<T> = Omit<T, keyof Auditoria> & {
  createdAt: FieldValue
  updatedAt: FieldValue
  deletedAt: Timestamp | null
}

/** Auditoria inicial para documentos nuevos. */
export const auditoriaInicial = (): {
  createdAt: FieldValue
  updatedAt: FieldValue
  deletedAt: null
} => ({
  createdAt: ahora(),
  updatedAt: ahora(),
  deletedAt: null,
})

/** Auditoria de una actualizacion (no toca `createdAt` ni `deletedAt`). */
export const auditoriaUpdate = (): { updatedAt: FieldValue } => ({ updatedAt: ahora() })

/** Lee un Timestamp a Date; tolera nulls de datos viejos. */
export const aDate = (valor: unknown): Date | null => {
  if (valor instanceof Timestamp) return valor.toDate()
  if (valor instanceof Date) return valor
  const ms = aMillis(valor)
  return ms !== null ? new Date(ms) : null
}

/**
 * Convierte cualquier representacion de fecha/timestamp a milisegundos de forma segura.
 * Soporta Timestamp de Firestore client, Timestamp de Admin SDK, Date, number, o plain objects {seconds, nanoseconds}.
 */
export const aMillis = (valor: unknown): number | null => {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'number') return valor
  if (valor instanceof Date) return valor.getTime()
  if (typeof valor === 'object') {
    const v = valor as Record<string, unknown>
    if (typeof v.toMillis === 'function') return (v.toMillis as () => number)()
    if (typeof v.toDate === 'function') return (v.toDate as () => Date)().getTime()
    if (typeof v.seconds === 'number') {
      const ms = (v.seconds as number) * 1000
      const nano = typeof v.nanoseconds === 'number' ? Math.floor(v.nanoseconds / 1_000_000) : 0
      return ms + nano
    }
    if (typeof v._seconds === 'number') {
      return (v._seconds as number) * 1000
    }
  }
  return null
}