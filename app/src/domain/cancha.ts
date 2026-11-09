import type { Timestamp } from './comun'

/** Tipos de cancha del PRD. */
export type TipoCancha = 'F5' | 'F7' | 'F8' | 'F11'

export const TIPOS_CANCHA: readonly TipoCancha[] = ['F5', 'F7', 'F8', 'F11']

/** Superficies disponibles para las canchas. */
export type TipoSuperficie = 'sintetico' | 'cesped_natural' | 'parquet' | 'cemento'

export const TIPOS_SUPERFICIE: readonly { id: TipoSuperficie; etiqueta: string; emoji: string }[] = [
  { id: 'sintetico', etiqueta: 'Césped Sintético', emoji: '🌱' },
  { id: 'cesped_natural', etiqueta: 'Césped Natural', emoji: '🌿' },
  { id: 'parquet', etiqueta: 'Parquet / Madera', emoji: '🪵' },
  { id: 'cemento', etiqueta: 'Cemento / Baldosa', emoji: '🧱' },
]

/**
 * Esquema de tarifas diferenciadas por horario o día de la semana.
 */
export interface TarifasDiferenciadas {
  /** Tarifa especial nocturna (ej. con uso de reflectores/iluminación LED). */
  precioNoche?: number
  /** Hora a partir de la cual aplica la tarifa nocturna (formato "HH:MM", ej. "19:00"). */
  horaInicioNoche?: string
  /** Tarifa especial para fines de semana (Sábados, Domingos y Feriados). */
  precioFinde?: number
}

/**
 * Sub-entidad de Predio (coleccion `predios/{predioId}/canchas/{canchaId}`).
 * "Identificador (ej. 'Cancha 1 - Sintetico F5')" segun PRD 3.
 */
export interface Cancha {
  id: string
  predioId: string
  nombre: string
  tipo: TipoCancha
  techada: boolean
  precioHora: number
  activa: boolean
  /** Galería de fotos reales de la cancha (césped, arcos, vista general). */
  fotos?: string[]
  /** Si cuenta con iluminación artificial para partidos nocturnos. */
  iluminacion?: boolean
  /** Tipo de césped o suelo deportivo. */
  tipoSuperficie?: TipoSuperficie
  /** Tarifas diferenciadas por horario (noche vs tarde) o días. */
  tarifas?: TarifasDiferenciadas
  createdAt: Timestamp
  updatedAt: Timestamp
}

export const etiquetaCancha = (
  c: Pick<Cancha, 'nombre' | 'tipo' | 'techada' | 'tipoSuperficie' | 'iluminacion'>,
): string => {
  const partes = [c.nombre, c.tipo]
  if (c.techada) partes.push('Techada')
  if (c.iluminacion) partes.push('Luz LED')
  return partes.join(' · ')
}

/**
 * Resuelve la tarifa horaria aplicable para una cancha en base al día y la hora.
 */
export const calcularPrecioHoraCancha = (
  cancha: Pick<Cancha, 'precioHora' | 'tarifas'>,
  fechaISO?: string,
  horaInicio?: string,
): number => {
  const tarifas = cancha.tarifas
  if (!tarifas) return cancha.precioHora

  // 1. Tarifa fin de semana (Sábado = 6, Domingo = 0)
  if (fechaISO && typeof tarifas.precioFinde === 'number' && tarifas.precioFinde > 0) {
    const d = new Date(`${fechaISO}T12:00:00`)
    const dia = d.getDay()
    if (dia === 0 || dia === 6) {
      return tarifas.precioFinde
    }
  }

  // 2. Tarifa nocturna
  if (horaInicio && typeof tarifas.precioNoche === 'number' && tarifas.precioNoche > 0) {
    const corte = tarifas.horaInicioNoche || '19:00'
    if (horaInicio >= corte) {
      return tarifas.precioNoche
    }
  }

  return cancha.precioHora
}
