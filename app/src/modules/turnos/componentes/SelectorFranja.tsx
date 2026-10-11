import { useEffect, useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
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
  const [autoSeleccionado, setAutoSeleccionado] = useState(false)
  const [fechaBusqueda, setFechaBusqueda] = useState(fechas[0] ?? aFechaISO())
  const [horaBusqueda, setHoraBusqueda] = useState('18:00')
  const [resultadoBusqueda, setResultadoBusqueda] = useState<Turno[] | null>(null)
  
  // Encontrar el turno más próximo disponible en general
  const turnoSugerido = useMemo(() => {
    return turnos
      .filter(estaTomable)
      .sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha)
        return a.horaInicio.localeCompare(b.horaInicio)
      })[0]
  }, [turnos])

  useEffect(() => {
    if (cargando || turnos.length === 0 || autoSeleccionado) return
    if (turnoSugerido && !seleccion) {
      alSeleccionar({
        canchaId: turnoSugerido.canchaId,
        fecha: turnoSugerido.fecha,
        horaInicio: turnoSugerido.horaInicio,
        horaFin: turnoSugerido.horaFin,
        precioTotal: turnoSugerido.precioTotal,
      })
      setAutoSeleccionado(true)
    }
  }, [cargando, turnos, autoSeleccionado, alSeleccionar, seleccion, turnoSugerido])

  const buscarTurno = () => {
    // Buscamos turnos disponibles en la fecha seleccionada
    // Y que la horaInicio sea igual o cercana (ej: despues de esa hora)
    const disponibles = turnos
      .filter(t => estaTomable(t) && t.fecha === fechaBusqueda && t.horaInicio >= horaBusqueda)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
    
    setResultadoBusqueda(disponibles.slice(0, 3)) // Mostrar hasta 3 opciones cercanas
  }

  if (canchas.length === 0) {
    return <p className="text-sm text-ink-muted">Este predio todavia no publico canchas.</p>
  }

  return (
    <div className="space-y-6">
      {cargando ? (
        <p className="text-sm text-ink-muted animate-pulse">Buscando horarios...</p>
      ) : (
        <>
          {/* SECCIÓN 1: SUGERENCIA */}
          {turnoSugerido ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
              <h3 className="text-emerald-500 font-black text-sm uppercase tracking-wider mb-2">
                Sugerencia: Turno más próximo
              </h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-white font-bold">{formatearFechaCorta(turnoSugerido.fecha)}</p>
                  <p className="text-zinc-400 text-sm">
                    {turnoSugerido.horaInicio} a {turnoSugerido.horaFin}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Cancha {canchas.find(c => c.id === turnoSugerido.canchaId)?.nombre}
                  </p>
                </div>
                <button
                  onClick={() =>
                    alSeleccionar({
                      canchaId: turnoSugerido.canchaId,
                      fecha: turnoSugerido.fecha,
                      horaInicio: turnoSugerido.horaInicio,
                      horaFin: turnoSugerido.horaFin,
                      precioTotal: turnoSugerido.precioTotal,
                    })
                  }
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${
                    seleccion?.horaInicio === turnoSugerido.horaInicio && seleccion?.fecha === turnoSugerido.fecha
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  {seleccion?.horaInicio === turnoSugerido.horaInicio && seleccion?.fecha === turnoSugerido.fecha ? 'Seleccionado' : 'Elegir'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center">
              <p className="text-red-400 font-bold">No hay turnos disponibles para los próximos 7 días.</p>
            </div>
          )}

          {/* SECCIÓN 2: BUSCADOR MANUAL */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <h3 className="text-white font-bold mb-4">Buscar otro turno</h3>
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">Fecha</label>
                <select 
                  value={fechaBusqueda}
                  onChange={(e) => setFechaBusqueda(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                >
                  {fechas.map(f => (
                    <option key={f} value={f}>{esHoy(f) ? 'Hoy' : formatearFechaCorta(f)}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">A partir de las</label>
                <input 
                  type="time" 
                  value={horaBusqueda}
                  onChange={(e) => setHoraBusqueda(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <button 
              onClick={buscarTurno}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl transition"
            >
              Buscar disponibilidad
            </button>
          </div>

          {/* RESULTADOS BÚSQUEDA */}
          {resultadoBusqueda !== null && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-zinc-400">Resultados:</h4>
              {resultadoBusqueda.length > 0 ? (
                resultadoBusqueda.map((t) => {
                  const elegido = seleccion?.horaInicio === t.horaInicio && seleccion?.fecha === t.fecha && seleccion?.canchaId === t.canchaId;
                  return (
                    <div key={t.id} className={`flex justify-between items-center p-3 rounded-xl border ${elegido ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900'}`}>
                      <div>
                        <p className="text-white font-bold">{t.horaInicio} a {t.horaFin}</p>
                        <p className="text-xs text-zinc-500">Cancha {canchas.find(c => c.id === t.canchaId)?.nombre}</p>
                      </div>
                      <button
                        onClick={() => alSeleccionar({
                          canchaId: t.canchaId,
                          fecha: t.fecha,
                          horaInicio: t.horaInicio,
                          horaFin: t.horaFin,
                          precioTotal: t.precioTotal,
                        })}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${elegido ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-white'}`}
                      >
                        {elegido ? 'Seleccionado' : 'Elegir'}
                      </button>
                    </div>
                  )
                })
              ) : (
                <p className="text-zinc-500 text-sm text-center py-2">No hay turnos disponibles desde esa hora.</p>
              )}
            </div>
          )}
        </>
      )}

      {seleccion && (
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-muted border-t border-zinc-800 pt-4">
          <CalendarDays className="h-4 w-4" />
          {formatearFechaCorta(seleccion.fecha)} · {seleccion.horaInicio} a {seleccion.horaFin} ·{' '}
          seña {formatearMoneda(predio.cobro.montoSena)}
        </p>
      )}
    </div>
  )
}
