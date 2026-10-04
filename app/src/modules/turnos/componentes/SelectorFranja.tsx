import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock } from 'lucide-react'
import type { CanchaResumen, Predio, Turno } from '@/domain'
import { bloqueoVencio } from '@/domain'
import { aFechaISO, esHoy, formatearFechaCorta, formatearMoneda, sumarDias } from '@/core/tiempo'
import { listarTurnosEnRango } from '@/modules/turnos/repositorio'

/** Ventana de reserva que se ofrece: hoy mas 7 dias. */
export const DIAS_DE_RESERVA = 7

export interface Seleccion {
  canchaId: string
  fecha: string
  horaInicio: string
  horaFin: string
  precioTotal: number
}

export function useGrillaSemana(predioId: string | null): {
  fechas: string[]
  turnos: Turno[]
  cargando: boolean
  error: string | null
} {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fechas = useMemo(() => {
    const hoy = aFechaISO()
    return Array.from({ length: DIAS_DE_RESERVA }, (_, i) => sumarDias(hoy, i))
  }, [])

  useEffect(() => {
    if (!predioId) return
    let vigente = true
    setCargando(true)
    const desde = aFechaISO()
    const hasta = sumarDias(desde, DIAS_DE_RESERVA - 1)

    listarTurnosEnRango(predioId, desde, hasta)
      .then((lista) => {
        if (vigente) setTurnos(lista)
      })
      .catch(() => {
        if (vigente) setError('No pudimos cargar los turnos de este predio.')
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })

    return () => {
      vigente = false
    }
  }, [predioId])

  return { fechas, turnos, cargando, error }
}

/** Un turno es tomable si esta libre y no tiene un bloqueo temporal vencido. */
export const estaTomable = (turno: Turno): boolean =>
  turno.estado === 'disponible' || bloqueoVencio(turno, Date.now())

export function SelectorFranja({
  predio,
  canchas,
  turnos,
  fechas,
  seleccion,
  alSeleccionar,
  cargando,
}: {
  predio: Predio
  canchas: CanchaResumen[]
  turnos: Turno[]
  fechas: string[]
  seleccion: Seleccion | null
  alSeleccionar: (seleccion: Seleccion | null) => void
  cargando: boolean
}) {
  const [canchaActiva, setCanchaActiva] = useState(canchas[0]?.id ?? '')
  const [fechaActiva, setFechaActiva] = useState(fechas[0] ?? aFechaISO())

  // Las franjas ya pastidas desaparecen de la oferta; se refleja solo.
  const franjas = useMemo(() => {
    return turnos
      .filter((t) => t.canchaId === canchaActiva && t.fecha === fechaActiva)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
  }, [turnos, canchaActiva, fechaActiva])

  if (canchas.length === 0) {
    return (
      <p className="text-sm text-ink-muted">Este predio todavia no publico canchas.</p>
    )
  }

  return (
    <div className="space-y-4">
      {canchas.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {canchas.map((cancha) => (
            <button
              key={cancha.id}
              type="button"
              onClick={() => setCanchaActiva(cancha.id)}
              className={`badge ${
                canchaActiva === cancha.id
                  ? 'bg-pitch-faint/60 text-pitch'
                  : 'bg-ink-faint/20 text-ink-muted'
              }`}
            >
              {cancha.nombre} · {cancha.tipo}
              {cancha.techada ? ' · Techada' : ''}
            </button>
          ))}
        </div>
      )}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {fechas.map((fecha) => (
          <button
            key={fecha}
            type="button"
            onClick={() => setFechaActiva(fecha)}
            className={`flex min-w-[64px] shrink-0 flex-col items-center rounded-xl border px-3 py-2 text-sm transition-colors ${
              fechaActiva === fecha
                ? 'border-pitch bg-pitch-faint/30 text-pitch'
                : 'border-ink-faint/25 text-ink-muted'
            }`}
          >
            <span className="font-semibold">{esHoy(fecha) ? 'Hoy' : formatearFechaCorta(fecha)}</span>
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-sm text-ink-muted">Buscando horarios...</p>
      ) : franjas.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No hay turnos cargados para esta fecha. Proba con otro dia.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {franjas.map((turno) => {
            const tomable = estaTomable(turno)
            const elegido =
              seleccion?.canchaId === turno.canchaId &&
              seleccion.fecha === turno.fecha &&
              seleccion.horaInicio === turno.horaInicio

            return (
              <li key={turno.id}>
                <button
                  type="button"
                  disabled={!tomable}
                  onClick={() =>
                    alSeleccionar(
                      elegido
                        ? null
                        : {
                            canchaId: turno.canchaId,
                            fecha: turno.fecha,
                            horaInicio: turno.horaInicio,
                            horaFin: turno.horaFin,
                            precioTotal: turno.precioTotal,
                          },
                    )
                  }
                  className={`w-full rounded-xl border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed ${
                    elegido
                      ? 'border-pitch bg-pitch-faint/30'
                      : tomable
                        ? 'border-ink-faint/25 hover:border-pitch'
                        : 'border-transparent bg-ink-faint/10'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <Clock className="h-4 w-4 shrink-0" />
                    {turno.horaInicio}
                  </span>
                  <span className="mt-1 block text-xs text-ink-muted">
                    {tomable ? `hasta ${turno.horaFin}` : 'Ocupado'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {seleccion && (
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
          <CalendarDays className="h-4 w-4" />
          {formatearFechaCorta(seleccion.fecha)} · {seleccion.horaInicio} a {seleccion.horaFin} ·{' '}
          seña {formatearMoneda(predio.cobro.montoSena)}
        </p>
      )}
    </div>
  )
}
