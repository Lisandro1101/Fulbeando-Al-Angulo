import { useEffect, useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import type { CanchaResumen, Predio, Turno } from '@/domain'
import { bloqueoVencio, calcularMontoSena } from '@/domain'
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
  montoSena: number
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

  const etiquetaSena = predio.cobro?.tipoSena === 'porcentaje'
    ? `Seña (${predio.cobro.porcentajeSena ?? 50}%)`
    : 'Seña'

  const calcularSena = (turno: Turno): number => {
    return calcularMontoSena(predio.cobro, turno.precioTotal)
  }
  
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
        montoSena: calcularSena(turnoSugerido),
      })
      setAutoSeleccionado(true)
    }
  }, [cargando, turnos, autoSeleccionado, alSeleccionar, seleccion, turnoSugerido])

  const buscarTurno = () => {
    const disponibles = turnos
      .filter(t => estaTomable(t) && t.fecha === fechaBusqueda && t.horaInicio >= horaBusqueda)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
    
    setResultadoBusqueda(disponibles.slice(0, 3))
  }

  if (canchas.length === 0) {
    return <p className="text-sm text-ink-muted">Este predio todavía no publicó canchas.</p>
  }

  return (
    <div className="space-y-6">
      {/* CANCHAS DISPONIBLES Y TARIFAS */}
      <div className="bg-canvas/70 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Canchas y Precios configurados
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {canchas.map((c) => (
            <div key={c.id} className="flex items-center justify-between bg-zinc-900/90 border border-zinc-800/80 rounded-xl px-3 py-2 text-xs">
              <div>
                <span className="font-bold text-white">⚽ {c.nombre}</span>
                <span className="text-zinc-500 ml-1.5 font-medium">({c.tipo.toUpperCase()}{c.techada ? ' · Techada' : ''})</span>
              </div>
              <span className="font-black text-emerald-400">{formatearMoneda(c.precioHora)}/h</span>
            </div>
          ))}
        </div>
      </div>

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
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <p className="text-white font-bold">{formatearFechaCorta(turnoSugerido.fecha)}</p>
                  <p className="text-zinc-300 text-sm font-semibold">
                    {turnoSugerido.horaInicio} a {turnoSugerido.horaFin}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Cancha {canchas.find(c => c.id === turnoSugerido.canchaId)?.nombre ?? 'Principal'}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs bg-zinc-900 border border-zinc-800 text-white font-bold px-2.5 py-1 rounded-lg">
                      Total: {formatearMoneda(turnoSugerido.precioTotal)}
                    </span>
                    <span className="text-xs bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold px-2.5 py-1 rounded-lg">
                      {etiquetaSena}: {formatearMoneda(calcularSena(turnoSugerido))}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() =>
                    alSeleccionar({
                      canchaId: turnoSugerido.canchaId,
                      fecha: turnoSugerido.fecha,
                      horaInicio: turnoSugerido.horaInicio,
                      horaFin: turnoSugerido.horaFin,
                      precioTotal: turnoSugerido.precioTotal,
                      montoSena: calcularSena(turnoSugerido),
                    })
                  }
                  className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 ${
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
                <label htmlFor="franja-fecha" className="block text-xs text-zinc-500 mb-1">Fecha</label>
                <select 
                  id="franja-fecha"
                  value={fechaBusqueda}
                  onChange={(e) => setFechaBusqueda(e.target.value)}
                  className="w-full bg-canvas border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                >
                  {fechas.map(f => (
                    <option key={f} value={f}>{esHoy(f) ? 'Hoy' : formatearFechaCorta(f)}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor="franja-hora" className="block text-xs text-zinc-500 mb-1">A partir de las</label>
                <input 
                  id="franja-hora"
                  type="time" 
                  value={horaBusqueda}
                  onChange={(e) => setHoraBusqueda(e.target.value)}
                  className="w-full bg-canvas border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
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
                  const senaT = calcularSena(t);
                  return (
                    <div key={t.id} className={`flex justify-between items-center p-3 rounded-xl border ${elegido ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900'}`}>
                      <div>
                        <p className="text-white font-bold">{t.horaInicio} a {t.horaFin}</p>
                        <p className="text-xs text-zinc-400">Cancha {canchas.find(c => c.id === t.canchaId)?.nombre}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className="font-bold text-white">Total: {formatearMoneda(t.precioTotal)}</span>
                          <span className="text-amber-400 font-bold">· {etiquetaSena}: {formatearMoneda(senaT)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => alSeleccionar({
                          canchaId: t.canchaId,
                          fecha: t.fecha,
                          horaInicio: t.horaInicio,
                          horaFin: t.horaFin,
                          precioTotal: t.precioTotal,
                          montoSena: senaT,
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 pt-4 bg-zinc-900/50 p-3 rounded-xl">
          <p className="flex items-center gap-1.5 text-xs sm:text-sm text-zinc-300">
            <CalendarDays className="h-4 w-4 text-emerald-500 shrink-0" />
            {formatearFechaCorta(seleccion.fecha)} · {seleccion.horaInicio} a {seleccion.horaFin} ·{' '}
            <span className="text-zinc-400 font-medium">Cancha {canchas.find(c => c.id === seleccion.canchaId)?.nombre}</span>
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-zinc-800 px-2 py-1 rounded-lg text-zinc-300">
              Total: <strong className="text-white">{formatearMoneda(seleccion.precioTotal)}</strong>
            </span>
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-lg">
              {etiquetaSena}: <strong>{formatearMoneda(seleccion.montoSena)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
