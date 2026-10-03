/** Zona horaria de operacion del MVP (Argentina). */
export const ZONA_HORARIA = 'America/Argentina/Buenos_Aires'

const partesDe = (date: Date): Record<string, number> => {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_HORARIA,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const out: Record<string, number> = {}
  for (const { type, value } of fmt.formatToParts(date)) {
    if (type !== 'literal') out[type] = Number(value)
  }
  return out
}

/** Desplazamiento de la zona horaria, en minutos, para esa fecha. */
export function offsetZona(date: Date): number {
  const p = partesDe(date)
  const comoUtc = Date.UTC(p.year ?? 1970, (p.month ?? 1) - 1, p.day ?? 1, p.hour ?? 0, p.minute ?? 0)
  return Math.round((comoUtc - date.getTime()) / 60000)
}

/** `Date` -> `YYYY-MM-DD` en la zona de operacion. */
export function aFechaISO(date: Date = new Date()): string {
  const p = partesDe(date)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** `Date` -> `HH:mm` en la zona de operacion. */
export function aHora(date: Date = new Date()): string {
  const p = partesDe(date)
  const hora = p.hour === 24 ? 0 : p.hour
  return `${String(hora).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}

/** Interpreta `YYYY-MM-DD` + `HH:mm` como un instante real en la zona de operacion. */
export function desdeFechaHora(fecha: string, hora: string): Date {
  const [y, m, d] = fecha.split('-').map(Number) as [number, number, number]
  const [hh, mm] = hora.split(':').map(Number) as [number, number]
  const naive = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0)
  const primera = naive - offsetZona(new Date(naive)) * 60000
  return new Date(naive - offsetZona(new Date(primera)) * 60000)
}

export function sumarMinutos(fecha: Date, minutos: number): Date {
  return new Date(fecha.getTime() + minutos * 60000)
}

export function sumarDias(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split('-').map(Number) as [number, number, number]
  const base = Date.UTC(y, (m ?? 1) - 1, d ?? 1)
  const salida = new Date(base + dias * 86400000)
  return `${salida.getUTCFullYear()}-${String(salida.getUTCMonth() + 1).padStart(2, '0')}-${String(salida.getUTCDate()).padStart(2, '0')}`
}

export const esHoy = (fechaISO: string, ahora: Date = new Date()): boolean =>
  fechaISO === aFechaISO(ahora)

const formatoMoneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export const formatearMoneda = (monto: number): string => formatoMoneda.format(monto)

const formatoFechaCorta = new Intl.DateTimeFormat('es-AR', {
  timeZone: ZONA_HORARIA,
  day: '2-digit',
  month: 'short',
})

export const formatearFechaCorta = (fechaISO: string): string =>
  formatoFechaCorta.format(desdeFechaHora(fechaISO, '00:00'))

/** Segundos restantes formateados para el temporizador del bloqueo. */
export function formatearCuentaRegresiva(msRestantes: number): string {
  const total = Math.max(0, Math.ceil(msRestantes / 1000))
  const min = Math.floor(total / 60)
  const seg = total % 60
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`
}