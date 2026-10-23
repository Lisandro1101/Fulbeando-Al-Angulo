import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Sparkles } from 'lucide-react'
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
      })[0] ?? null
  }, [turnos])

  // Seleccionar automáticamente el primer turno sugerido si no hay selección previa
  useEffect(() => {
    if (cargando) return
    if (!autoSeleccionado && turnos.length > 0 && !seleccion && turnoSugerido) {
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
    return <p className="text-sm text-slate-700 font-bold">Este predio todavía no publicó canchas.</p>
  }

  return (
    <div className="space-y-5">
      {/* CANCHAS DISPONIBLES Y TARIFAS */}
      <div className="bg-slate-100/80 border border-slate-300 rounded-2xl p-4 space-y-2.5 shadow-sm">
        <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
          Canchas y Precios configurados
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {canchas.map((c) => (
            <div key={c.id} className="flex items-center justify-between bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs shadow-sm">
              <div>
                <span className="font-black text-slate-950">⚽ {c.nombre}</span>
                <span className="text-slate-600 ml-1.5 font-bold">({c.tipo.toUpperCase()}{c.techada ? ' · Techada' : ''})</span>
              </div>
              <span className="font-black text-emerald-850 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-lg text-emerald-900">{formatearMoneda(c.precioHora)}/h</span>
            </div>
          ))}
        </div>
      </div>

      {cargando ? (
        <p className="text-sm text-slate-500 font-medium animate-pulse">Buscando horarios...</p>
      ) : (
        <>
          {/* SECCIÓN 1: SUGERENCIA */}
          {turnoSugerido ? (
            <div className="bg-gradient-to-b from-emerald-50 via-emerald-50/80 to-teal-50/40 border border-emerald-300 rounded-2xl p-4 shadow-sm">
              <h3 className="text-emerald-900 font-black text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Sugerencia: Turno más próximo
              </h3>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <p className="text-base font-black text-slate-900">{formatearFechaCorta(turnoSugerido.fecha)}</p>
                  <p className="text-slate-700 text-sm font-bold">
                    {turnoSugerido.horaInicio} a {turnoSugerido.horaFin}
                  </p>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Cancha <strong className="text-slate-900">{canchas.find(c => c.id === turnoSugerido.canchaId)?.nombre ?? 'Principal'}</strong>
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-xs bg-white border border-slate-300 text-slate-900 font-bold px-2.5 py-1 rounded-lg shadow-sm">
                      Total: {formatearMoneda(turnoSugerido.precioTotal)}
                    </span>
                    <span className="text-xs bg-amber-50 border border-amber-300 text-amber-900 font-extrabold px-2.5 py-1 rounded-lg shadow-sm">
                      {etiquetaSena}: {formatearMoneda(calcularSena(turnoSugerido))}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
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
                  className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shrink-0 cursor-pointer shadow-sm ${
                    seleccion?.horaInicio === turnoSugerido.horaInicio && seleccion?.fecha === turnoSugerido.fecha
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-500 ring-offset-2'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {seleccion?.horaInicio === turnoSugerido.horaInicio && seleccion?.fecha === turnoSugerido.fecha ? '✓ Seleccionado' : 'Elegir este'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
              <p className="text-rose-700 font-bold text-sm">No hay turnos disponibles para los próximos 7 días.</p>
            </div>
          )}

          {/* SECCIÓN 2: BUSCADOR MANUAL */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-sm">
            <h3 className="text-slate-900 font-extrabold text-sm">Buscar otro turno</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="franja-fecha" className="block text-xs font-bold text-slate-600 mb-1">Fecha</label>
                <select 
                  id="franja-fecha"
                  value={fechaBusqueda}
                  onChange={(e) => setFechaBusqueda(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm"
                >
                  {fechas.map(f => (
                    <option key={f} value={f}>{esHoy(f) ? 'Hoy' : formatearFechaCorta(f)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="franja-hora" className="block text-xs font-bold text-slate-600 mb-1">A partir de las</label>
                <input 
                  id="franja-hora"
                  type="time" 
                  value={horaBusqueda}
                  onChange={(e) => setHoraBusqueda(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm"
                />
              </div>
            </div>
            <button 
              type="button"
              onClick={buscarTurno}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer shadow-sm"
            >
              Buscar disponibilidad
            </button>
          </div>

          {/* RESULTADOS BÚSQUEDA */}
          {resultadoBusqueda !== null && (
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wide text-slate-700">Resultados encontrados:</h4>
              {resultadoBusqueda.length > 0 ? (
                resultadoBusqueda.map((t) => {
                  const elegido = seleccion?.horaInicio === t.horaInicio && seleccion?.fecha === t.fecha && seleccion?.canchaId === t.canchaId;
                  const senaT = calcularSena(t);
                  return (
                    <div key={t.id} className={`flex justify-between items-center p-3.5 rounded-xl border transition-all ${elegido ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
                      <div>
                        <p className="text-sm font-black text-slate-900">{t.horaInicio} a {t.horaFin}</p>
                        <p className="text-xs text-slate-600 font-semibold">Cancha {canchas.find(c => c.id === t.canchaId)?.nombre}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className="font-bold text-slate-800">Total: {formatearMoneda(t.precioTotal)}</span>
                          <span className="text-amber-900 font-black bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">· {etiquetaSena}: {formatearMoneda(senaT)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => alSeleccionar({
                          canchaId: t.canchaId,
                          fecha: t.fecha,
                          horaInicio: t.horaInicio,
                          horaFin: t.horaFin,
                          precioTotal: t.precioTotal,
                          montoSena: senaT,
                        })}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${elegido ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                      >
                        {elegido ? '✓ Seleccionado' : 'Elegir'}
                      </button>
                    </div>
                  )
                })
              ) : (
                <p className="text-slate-600 text-sm text-center py-3 bg-slate-100 rounded-xl border border-slate-300 font-semibold">No hay turnos disponibles desde esa hora.</p>
              )}
            </div>
          )}
        </>
      )}

      {seleccion && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/70 p-3.5 rounded-2xl shadow-sm">
          <p className="flex items-center gap-2 text-xs sm:text-sm text-slate-800 font-bold">
            <CalendarDays className="h-4 w-4 text-emerald-600 shrink-0" />
            {formatearFechaCorta(seleccion.fecha)} · {seleccion.horaInicio} a {seleccion.horaFin} ·{' '}
            <span className="text-slate-600 font-medium">Cancha {canchas.find(c => c.id === seleccion.canchaId)?.nombre}</span>
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-xl text-slate-700 shadow-sm">
              Total: <strong className="text-slate-900 font-black">{formatearMoneda(seleccion.precioTotal)}</strong>
            </span>
            <span className="bg-amber-100/80 border border-amber-300 text-amber-900 font-bold px-2.5 py-1 rounded-xl shadow-sm">
              {etiquetaSena}: <strong className="font-black">{formatearMoneda(seleccion.montoSena)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
