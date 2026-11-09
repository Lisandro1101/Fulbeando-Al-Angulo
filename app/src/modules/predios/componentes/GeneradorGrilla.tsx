import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  Check,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
import type { Franja, Predio, TarifasDiferenciadas } from '@/domain'
import { errorEnFranjas, minutosRelativos } from '@/domain'
import {
  bloquearTurnosDeFecha,
  desbloquearTurnosDeFecha,
  generarGrillaMasiva,
} from '@/modules/turnos/repositorio'
import { listarCanchas } from '@/modules/canchas/repositorio'
import { actualizarPredio } from '@/modules/predios/repositorio'
import { obtenerFeriado, sumarDias } from '@/core/tiempo'
import { toast } from '@/components/ui/sonner'

/** Minutos -> `HH:mm`. */
const formatearHora = (minutos: number): string => {
  const m = minutos % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Franja horaria de apertura general del predio (ej. Mañana 09:00 a 13:00, Tarde 16:00 a 00:00). */
export interface FranjaApertura {
  desde: string
  hasta: string
}

/**
 * Divide una o más franjas de apertura en bloques individuales de N minutos.
 */
function calcularTurnosDesdeApertura(
  aperturas: FranjaApertura[],
  duracionMinutos: number
): Franja[] {
  const turnos: Franja[] = []

  for (const ap of aperturas) {
    if (!ap.desde || !ap.hasta) continue

    let cursorRel = minutosRelativos(ap.desde)
    let finRel = minutosRelativos(ap.hasta)

    // Si cierra a medianoche o madrugada siguiente (ej: 18:00 a 01:00)
    if (ap.hasta === '00:00' || ap.hasta === '24:00') {
      finRel = minutosRelativos('24:00')
    }
    if (finRel <= cursorRel) {
      finRel += 1440
    }

    while (cursorRel + duracionMinutos <= finRel) {
      const nextRel = cursorRel + duracionMinutos
      turnos.push({
        horaInicio: formatearHora((cursorRel + 360) % 1440),
        horaFin: formatearHora((nextRel + 360) % 1440 || 1440),
      })
      cursorRel = nextRel
    }
  }

  return turnos
}

export function GeneradorGrilla({
  predio,
  fecha,
  onGenerado,
}: {
  predio: Predio
  fecha: string
  onGenerado: () => void | Promise<void>
}) {
  // Horarios de apertura del complejo (por defecto 1 franja corrida de 14:00 a 00:00)
  const [aperturas, setAperturas] = useState<FranjaApertura[]>([
    { desde: '14:00', hasta: '00:00' },
  ])

  // Duración de cada partido
  const [duracionTurno, setDuracionTurno] = useState<number>(60)

  // Modo de edición: 'asistido' (por apertura) o 'manual' (afinar cada turno a mano)
  const [modoAvanzado, setModoAvanzado] = useState(false)

  // Turnos calculados que se enviarán a la base de datos
  const [franjas, setFranjas] = useState<Franja[]>(() => {
    if (predio.franjasBase && predio.franjasBase.length > 0) return predio.franjasBase
    return calcularTurnosDesdeApertura([{ desde: '14:00', hasta: '00:00' }], 60)
  })

  const [generando, setGenerando] = useState(false)
  const [progreso, setProgreso] = useState<{ creados: number; total: number } | null>(null)
  const [resultado, setResultado] = useState<{ creados: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [hasta, setHasta] = useState(fecha)
  const [dias, setDias] = useState<number[]>(() => {
    if (predio.diasBase && predio.diasBase.length > 0) return predio.diasBase
    const d = new Date(fecha)
    const utcDay = d.getUTCDay()
    return [utcDay === 0 ? 7 : utcDay]
  })

  // Feriados
  const [excluirFeriados, setExcluirFeriados] = useState(true)
  const [operandoFeriado, setOperandoFeriado] = useState<string | null>(null)

  const [canchas, setCanchas] = useState<
    Array<{ id: string; nombre: string; precioHora: number; tarifas?: TarifasDiferenciadas }>
  >([])
  const [cargandoCanchas, setCargandoCanchas] = useState(true)

  useEffect(() => {
    let vigente = true
    setCargandoCanchas(true)
    listarCanchas(predio.id)
      .then((lista) => {
        if (vigente)
          setCanchas(
            lista.map(({ id, nombre, precioHora, tarifas }) => ({
              id,
              nombre,
              precioHora,
              tarifas,
            }))
          )
      })
      .finally(() => {
        if (vigente) setCargandoCanchas(false)
      })
    return () => {
      vigente = false
    }
  }, [predio.id])

  // Recalcular turnos automáticamente cuando cambian los horarios de apertura o la duración
  useEffect(() => {
    if (!modoAvanzado) {
      const calculados = calcularTurnosDesdeApertura(aperturas, duracionTurno)
      setFranjas(calculados)
    }
  }, [aperturas, duracionTurno, modoAvanzado])

  const problema = useMemo(() => errorEnFranjas(franjas), [franjas])
  const totalPorDia = canchas.length * franjas.length

  // Lista de fechas proyectadas en base a los días seleccionados
  const fechasSeleccionadas = useMemo(() => {
    const lista: string[] = []
    const actual = new Date(fecha)
    const fin = new Date(hasta)
    if (fin < actual) return lista

    while (actual <= fin) {
      const d = actual.getUTCDay()
      const diaISO = d === 0 ? 7 : d
      if (dias.includes(diaISO)) {
        lista.push(actual.toISOString().split('T')[0]!)
      }
      actual.setUTCDate(actual.getUTCDate() + 1)
    }
    return lista
  }, [fecha, hasta, dias])

  // Feriados detectados en el rango seleccionado
  const feriadosEnRango = useMemo(() => {
    return fechasSeleccionadas
      .map((f) => ({ fecha: f, feriado: obtenerFeriado(f) }))
      .filter((item): item is { fecha: string; feriado: NonNullable<ReturnType<typeof obtenerFeriado>> } => item.feriado !== null)
  }, [fechasSeleccionadas])

  const agregarFranjaApertura = () => {
    setAperturas((prev) => [...prev, { desde: '18:00', hasta: '23:00' }])
  }

  const quitarFranjaApertura = (index: number) => {
    setAperturas((prev) => prev.filter((_, i) => i !== index))
  }

  const cambiarApertura = (index: number, campo: 'desde' | 'hasta', valor: string) => {
    setAperturas((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    )
  }

  // Generador principal con proceso en segundo plano y confirmación inmediata (Dar el OK)
  const generar = async (fechasCustom?: string[]) => {
    const fechas = fechasCustom ?? fechasSeleccionadas

    if (fechas.length === 0) {
      setError('No hay fechas que coincidan con los días seleccionados.')
      return
    }

    setGenerando(true)
    setError(null)
    setResultado(null)
    setProgreso({ creados: 0, total: fechas.length * canchas.length * franjas.length })

    const toastId = 'grilla-bg'
    toast.loading(`Generando turnos en segundo plano para ${fechas.length} fecha(s)...`, { id: toastId })

    try {
      const creados = await generarGrillaMasiva(
        canchas.map(({ id, precioHora, tarifas }) => ({ id, precioHora, tarifas })),
        fechas,
        franjas,
        predio,
        {
          excluirFeriados,
          onProgreso: (actuales, total) => {
            setProgreso({ creados: actuales, total })
            toast.loading(`Generando turnos... (${actuales} turnos creados)`, { id: toastId })
          },
        }
      )

      await actualizarPredio(predio.id, {
        franjasBase: franjas,
        diasBase: dias,
      })

      setResultado({ creados })
      toast.success(
        creados === 0
          ? 'La grilla ya estaba completa para las fechas seleccionadas.'
          : `¡Grilla publicada con éxito! Se crearon ${creados} turnos disponibles.`,
        { id: toastId }
      )
      await onGenerado()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No pudimos generar la grilla.'
      setError(msg)
      toast.error(`Error al generar grilla: ${msg}`, { id: toastId })
    } finally {
      setGenerando(false)
      setProgreso(null)
    }
  }

  // Replicar la grilla de una semana a la siguiente con 1 solo clic
  const replicarProximaSemana = async () => {
    const inicioProx = sumarDias(fecha, 7)
    const finProx = sumarDias(fecha, 13)
    const fechasProx: string[] = []
    const cursor = new Date(inicioProx)
    const fin = new Date(finProx)

    while (cursor <= fin) {
      const d = cursor.getUTCDay()
      const diaISO = d === 0 ? 7 : d
      if (dias.includes(diaISO)) {
        fechasProx.push(cursor.toISOString().split('T')[0]!)
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    if (fechasProx.length === 0) {
      toast.error('No hay fechas activas en los días de la próxima semana.')
      return
    }

    toast.info(`Replicando grilla hacia la próxima semana (${fechasProx.length} días seleccionados)...`)
    await generar(fechasProx)
  }

  // Pausar o reactivar turnos de un feriado completo
  const toggleFeriadoCompleto = async (fechaFeriado: string, motivo: string, pausar: boolean) => {
    setOperandoFeriado(fechaFeriado)
    try {
      if (pausar) {
        const bloqueados = await bloquearTurnosDeFecha(predio.id, fechaFeriado, `Feriado: ${motivo}`)
        toast.success(`Feriado pausado: se bloquearon ${bloqueados} turnos del ${fechaFeriado.split('-').reverse().join('/')}.`)
      } else {
        const desbloqueados = await desbloquearTurnosDeFecha(predio.id, fechaFeriado)
        toast.success(`Turnos reactivados: se habilitaron ${desbloqueados} turnos del ${fechaFeriado.split('-').reverse().join('/')}.`)
      }
      await onGenerado()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al modificar turnos del feriado.')
    } finally {
      setOperandoFeriado(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* SECCIÓN 1: HORARIOS DE APERTURA DEL COMPLEJO */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" /> Horario de Apertura del Predio
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Definí el horario de corrido o cortado en partes (ej: mañana y tarde).
            </p>
          </div>
          <button
            type="button"
            onClick={agregarFranjaApertura}
            className="text-xs bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-500/30 font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar otra parte
          </button>
        </div>

        <div className="space-y-3">
          {aperturas.map((ap, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm"
            >
              <span className="text-xs font-bold text-slate-600 shrink-0">
                {aperturas.length > 1 ? `Parte ${idx + 1}:` : 'Horario:'}
              </span>
              <div className="flex items-center gap-2 flex-1">
                <input
                  aria-label="Hora de apertura (desde)"
                  type="time"
                  value={ap.desde}
                  onChange={(e) => cambiarApertura(idx, 'desde', e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 font-bold outline-none focus:border-emerald-500 w-28 text-center"
                />
                <span className="text-slate-500 text-xs font-bold">hasta</span>
                <input
                  aria-label="Hora de apertura (hasta)"
                  type="time"
                  value={ap.hasta}
                  onChange={(e) => cambiarApertura(idx, 'hasta', e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 font-bold outline-none focus:border-emerald-500 w-28 text-center"
                />
              </div>
              {aperturas.length > 1 && (
                <button
                  type="button"
                  onClick={() => quitarFranjaApertura(idx)}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition cursor-pointer"
                  title="Eliminar franja"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* SELECTOR DE DURACIÓN DE PARTIDO */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800">
            Duración de cada partido / turno:
          </label>
          <div className="flex gap-2">
            {[60, 90, 120].map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setDuracionTurno(min)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  duracionTurno === min
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400'
                }`}
              >
                {min} min
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* VISTA PREVIA DE TURNOS QUE SE VAN A GENERAR */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Turnos calculados automáticamente ({franjas.length} por cancha)
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setModoAvanzado(!modoAvanzado)}
            className="text-[11px] text-slate-500 hover:text-emerald-700 underline font-semibold cursor-pointer"
          >
            {modoAvanzado ? 'Volver a modo apertura' : 'Ajustar turnos a mano'}
          </button>
        </div>

        {franjas.length === 0 ? (
          <p className="text-xs text-rose-600 font-semibold p-2">
            ⚠️ No hay turnos generados. Verificá que la hora de cierre sea posterior a la apertura.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
            {franjas.map((f, i) => (
              <span
                key={i}
                className="bg-white border border-slate-300 text-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <span className="text-emerald-600 font-mono">#{i + 1}</span>
                {f.horaInicio} - {f.horaFin}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: OPCIONES DE REPETICIÓN (FECHAS Y DÍAS) */}
      <div className="rounded-2xl border border-slate-300 bg-slate-100/70 p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-600" /> Días y Rango de Fechas
          </h3>
          {/* Botón rápido para replicar a la próxima semana con 1 solo clic */}
          <button
            type="button"
            onClick={() => void replicarProximaSemana()}
            disabled={generando || canchas.length === 0}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Genera automáticamente la grilla para los mismos días de la próxima semana"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" /> Replicar próxima semana
          </button>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 uppercase" htmlFor="gen-hasta">
            Generar desde el {fecha.split('-').reverse().join('/')} hasta el:
          </label>
          <div className="flex gap-2">
            <input
              id="gen-hasta"
              type="date"
              value={hasta}
              min={fecha}
              onChange={(e) => setHasta(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-bold outline-none focus:border-emerald-500 shadow-sm"
            />
            {/* Atajos de rango extendido */}
            <div className="flex gap-1.5">
              {[
                { label: '+7d', dias: 7 },
                { label: '+1m', dias: 30 },
                { label: '+3m', dias: 90 },
                { label: '+6m', dias: 180 },
              ].map(({ label, dias: cantDias }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setHasta(sumarDias(fecha, cantDias))}
                  className="px-2.5 py-1 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer shadow-sm"
                  title={`Extender hasta +${cantDias} días`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold text-slate-700 uppercase">
            Días de la semana a generar
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Lun', val: 1 },
              { label: 'Mar', val: 2 },
              { label: 'Mié', val: 3 },
              { label: 'Jue', val: 4 },
              { label: 'Vie', val: 5 },
              { label: 'Sáb', val: 6 },
              { label: 'Dom', val: 7 },
            ].map(({ label, val }) => (
              <label
                key={val}
                className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition shadow-sm ${
                  dias.includes(val)
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-extrabold'
                    : 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-950 font-bold hover:border-slate-400'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={dias.includes(val)}
                  onChange={(e) => {
                    if (e.target.checked) setDias([...dias, val])
                    else setDias(dias.filter((d) => d !== val))
                  }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* SECCIÓN FERIADOS NACIONALES */}
        <div className="pt-2 border-t border-slate-200 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={excluirFeriados}
              onChange={(e) => setExcluirFeriados(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-800">
              Excluir feriados nacionales automáticamente (no crear turnos)
            </span>
          </label>

          {feriadosEnRango.length > 0 && (
            <div className="mt-2 p-3 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Feriados detectados en el rango ({feriadosEnRango.length}):
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {feriadosEnRango.map(({ fecha: fFecha, feriado }) => (
                  <div
                    key={fFecha}
                    className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 rounded-lg border border-amber-200 shadow-2xs"
                  >
                    <span className="font-bold text-slate-800">
                      📅 {fFecha.split('-').reverse().join('/')}:{' '}
                      <span className="text-amber-800 font-semibold">{feriado.motivo}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void toggleFeriadoCompleto(fFecha, feriado.motivo, true)}
                        disabled={operandoFeriado === fFecha}
                        className="text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-md border border-rose-200 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Bloquear todos los turnos disponibles de este día"
                      >
                        <Ban className="w-3 h-3 text-rose-600" /> Bloquear día
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleFeriadoCompleto(fFecha, feriado.motivo, false)}
                        disabled={operandoFeriado === fFecha}
                        className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Reactivar turnos de este día"
                      >
                        <RefreshCw className="w-3 h-3 text-emerald-600" /> Habilitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RESUMEN Y ACCIÓN */}
      <div className="space-y-3 pt-2">
        <p className="text-xs text-slate-600">
          {cargandoCanchas ? (
            'Cargando canchas...'
          ) : canchas.length === 0 ? (
            '⚠️ Este predio no tiene canchas activas. Creá al menos una cancha para generar la grilla.'
          ) : (
            <>
              Total estimado: <span className="font-bold text-slate-900">{canchas.length} cancha{canchas.length === 1 ? '' : 's'}</span> ×{' '}
              <span className="font-bold text-slate-900">{franjas.length} turnos diarios</span> ={' '}
              <span className="font-bold text-emerald-700">{totalPorDia} turnos por día</span>{' '}
              ({fechasSeleccionadas.length} fecha{fechasSeleccionadas.length === 1 ? '' : 's'} seleccionada{fechasSeleccionadas.length === 1 ? '' : 's'}).
            </>
          )}
        </p>

        {progreso && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-emerald-800">
              <span>Procesando en segundo plano...</span>
              <span>{progreso.creados} turnos creados</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300 animate-pulse"
                style={{ width: `${Math.min(100, Math.max(10, (progreso.creados / (progreso.total || 1)) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {problema && (
          <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
            {problema}
          </p>
        )}
        {error && (
          <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
            {error}
          </p>
        )}
        {resultado && (
          <p className="flex items-center gap-2 text-sm text-emerald-800 font-bold bg-emerald-50 border border-emerald-300 p-3 rounded-xl shadow-sm">
            <Check className="h-4 w-4 text-emerald-600" />
            {resultado.creados === 0
              ? 'La grilla ya estaba completa para esa fecha.'
              : `¡Éxito! Se crearon ${resultado.creados} turnos disponibles.`}
          </p>
        )}

        <button
          type="button"
          className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          onClick={() => void generar()}
          disabled={
            generando ||
            cargandoCanchas ||
            problema !== null ||
            canchas.length === 0 ||
            franjas.length === 0 ||
            fechasSeleccionadas.length === 0
          }
        >
          {generando && <Loader2 className="h-4 w-4 animate-spin" />}
          {generando ? 'GENERANDO EN SEGUNDO PLANO...' : 'PUBLICAR GRILLA DE TURNOS'}
        </button>
      </div>
    </div>
  )
}
