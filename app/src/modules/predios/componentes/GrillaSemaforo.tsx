import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'
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

export interface SlotVacioSeleccionado {
  cancha: CanchaResumen
  hora: string
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
  alSeleccionarVacio,
  franjasBase = [],
  seleccionadoId,
}: {
  canchas: CanchaResumen[]
  turnos: Turno[]
  alSeleccionar: (celda: CeldaSeleccionada | null) => void
  alSeleccionarVacio?: (slot: SlotVacioSeleccionado) => void
  franjasBase?: string[]
  seleccionadoId: string | null
}) {
  const ahoraMs = Date.now()

  const franjas = useMemo(() => {
    const horasTurnos = turnos.map((t) => t.horaInicio)
    return [...new Set([...horasTurnos, ...franjasBase])].sort()
  }, [turnos, franjasBase])

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
              <th className="sticky left-0 z-10 max-w-28 truncate bg-white/95 backdrop-blur-sm pr-2 text-left text-xs font-bold text-slate-800">
                {cancha.nombre}
              </th>
              {franjas.map((hora) => {
                const turno = turnoDe(cancha.id, hora)
                if (!turno) {
                  return (
                    <td key={hora}>
                      {alSeleccionarVacio ? (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title={`Habilitar turno ${hora} en ${cancha.nombre}`}
                          aria-label={`Habilitar turno ${hora} en ${cancha.nombre}`}
                          onClick={() => alSeleccionarVacio({ cancha, hora })}
                          className="group flex h-11 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 hover:border-emerald-500 hover:bg-emerald-50/30 transition-colors cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:scale-110 transition-all" />
                        </motion.button>
                      ) : (
                        <span className="block h-11 rounded-lg border border-dashed border-slate-200" />
                      )}
                    </td>
                  )
                }

                const estado = semaforo(turno, ahoraMs)
                const seleccionado = seleccionadoId === turno.id

                return (
                  <td key={hora}>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      title={`${turno.horaInicio} - ${turno.horaFin}: ${etiquetaEstado[estado]}`}
                      aria-label={`${cancha.nombre} ${turno.horaInicio}: ${etiquetaEstado[estado]}`}
                      onClick={() =>
                        alSeleccionar(
                          seleccionado ? null : { turno, semaforo: estado },
                        )
                      }
                      className={`h-11 w-full rounded-lg border text-[11px] font-bold transition-all shadow-sm cursor-pointer ${
                        CLASE_SEMAFORO[estado]
                      } ${seleccionado ? 'scale-[1.04] ring-2 ring-emerald-500 shadow-md' : ''}`}
                    >
                      {estado === 'pendiente' ? 'Revisar' : turno.horaInicio}
                    </motion.button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="mt-3.5 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
        <li className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-gradient-to-br from-emerald-100 to-green-200 border border-emerald-400/80 shadow-sm" /> Libre
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-400/80 shadow-sm" /> Comprobante
          pendiente
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-gradient-to-br from-rose-100 to-rose-200 border border-rose-400/80 shadow-sm" /> Reservado
        </li>
      </ul>
    </div>
  )
}
