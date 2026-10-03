import { useMemo } from 'react'
import type { CanchaResumen, SemaforoTurno, Turno } from '@/domain'
import { semaforo } from '@/domain'

const CLASE_SEMAFORO: Record<SemaforoTurno, string> = {
  libre: 'slot-libre border-pitch/40',
  pendiente: 'slot-pendiente border-urgent/50',
  ocupado: 'slot-ocupado border-occupied/40',
}

export interface CeldaSeleccionada {
  turno: Turno
  semaforo: SemaforoTurno
}

const etiquetaEstado: Record<SemaforoTurno, string> = {
  libre: 'Libre',
  pendiente: 'Comprobante pendiente',
  ocupado: 'Reservado',
}

/**
 * Grilla del dia tipo semaforo (PRD 4.4): filas = canchas, columnas = franjas.
 * Verde libre / Amarillo solicitud pendiente / Rojo reservado confirmado.
 */
export function GrillaSemaforo({
  canchas,
  turnos,
  alSeleccionar,
  seleccionadoId,
}: {
  canchas: CanchaResumen[]
  turnos: Turno[]
  alSeleccionar: (celda: CeldaSeleccionada | null) => void
  seleccionadoId: string | null
}) {
  const ahoraMs = Date.now()

  const franjas = useMemo(
    () => [...new Set(turnos.map((t) => t.horaInicio))].sort(),
    [turnos],
  )

  const turnoDe = (canchaId: string, horaInicio: string): Turno | undefined =>
    turnos.find((t) => t.canchaId === canchaId && t.horaInicio === horaInicio)

  if (canchas.length === 0) {
    return <p className="text-sm text-ink-muted">Este predio no tiene canchas cargadas.</p>
  }

  if (franjas.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No hay turnos cargados para esta fecha.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto pb-2">
      <table className="w-full min-w-[520px] border-separate border-spacing-1">
        <tbody>
          {canchas.map((cancha) => (
            <tr key={cancha.id}>
              <th className="sticky left-0 z-10 max-w-28 truncate bg-canvas-raised pr-2 text-left text-xs font-medium text-ink">
                {cancha.nombre}
              </th>
              {franjas.map((hora) => {
                const turno = turnoDe(cancha.id, hora)
                if (!turno) {
                  return (
                    <td key={hora}>
                      <span className="block h-11 rounded-lg border border-dashed border-ink-faint/20" />
                    </td>
                  )
                }

                const estado = semaforo(turno, ahoraMs)
                const seleccionado = seleccionadoId === turno.id

                return (
                  <td key={hora}>
                    <button
                      type="button"
                      title={`${turno.horaInicio} - ${turno.horaFin}: ${etiquetaEstado[estado]}`}
                      aria-label={`${cancha.nombre} ${turno.horaInicio}: ${etiquetaEstado[estado]}`}
                      onClick={() =>
                        alSeleccionar(
                          seleccionado ? null : { turno, semaforo: estado },
                        )
                      }
                      className={`h-11 w-full rounded-lg border text-[11px] font-semibold transition-transform ${
                        CLASE_SEMAFORO[estado]
                      } ${seleccionado ? 'scale-[1.04] ring-2 ring-ink' : ''}`}
                    >
                      {estado === 'pendiente' ? 'Revisar' : turno.horaInicio}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="mt-3 flex flex-wrap gap-3 text-xs text-ink-muted">
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-pitch-faint ring-1 ring-pitch/40" /> Libre
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-urgent-faint ring-1 ring-urgent/50" /> Comprobante
          pendiente
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-occupied-faint ring-1 ring-occupied/40" /> Reservado
        </li>
      </ul>
    </div>
  )
}