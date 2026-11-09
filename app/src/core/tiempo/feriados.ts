/**
 * Calendario de Feriados Nacionales de Argentina (inamovibles y trasladables clave).
 */
export interface FeriadoInfo {
  mesDia: string // MM-DD
  motivo: string
}

export const FERIADOS_NACIONALES: readonly FeriadoInfo[] = [
  { mesDia: '01-01', motivo: 'Año Nuevo' },
  { mesDia: '02-16', motivo: 'Carnaval (Lunes)' },
  { mesDia: '02-17', motivo: 'Carnaval (Martes)' },
  { mesDia: '03-24', motivo: 'Día Nacional de la Memoria por la Verdad y la Justicia' },
  { mesDia: '04-02', motivo: 'Día del Veterano y Caídos en la Guerra de Malvinas' },
  { mesDia: '04-03', motivo: 'Viernes Santo' },
  { mesDia: '05-01', motivo: 'Día del Trabajador' },
  { mesDia: '05-25', motivo: 'Día de la Revolución de Mayo' },
  { mesDia: '06-20', motivo: 'Paso a la Inmortalidad del Gral. Manuel Belgrano' },
  { mesDia: '07-09', motivo: 'Día de la Independencia' },
  { mesDia: '08-17', motivo: 'Paso a la Inmortalidad del Gral. José de San Martín' },
  { mesDia: '10-12', motivo: 'Día del Respeto a la Diversidad Cultural' },
  { mesDia: '11-20', motivo: 'Día de la Soberanía Nacional' },
  { mesDia: '12-08', motivo: 'Inmaculada Concepción de María' },
  { mesDia: '12-25', motivo: 'Navidad' },
]

/**
 * Determina si una fecha dada en formato YYYY-MM-DD corresponde a un feriado nacional.
 */
export function obtenerFeriado(fechaISO: string): FeriadoInfo | null {
  if (!fechaISO || fechaISO.length < 10) return null
  const mesDia = fechaISO.slice(5) // Extrae MM-DD
  return FERIADOS_NACIONALES.find((f) => f.mesDia === mesDia) ?? null
}

export function esFeriado(fechaISO: string): boolean {
  return obtenerFeriado(fechaISO) !== null
}
