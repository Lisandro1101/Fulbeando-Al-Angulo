import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Lock, Plus, Unlock, X } from 'lucide-react'
import type { Predio, Turno } from '@/domain'
import { canchasDe } from '@/domain'
import { aFechaISO, esHoy, formatearFechaCorta, formatearMoneda, sumarDias } from '@/core/tiempo'
import { actualizarCobro, listarPrediosDelDueno } from '@/modules/predios/repositorio'
import {
  aprobarTurno,
  bloquearManualmente,
  liberarTurno,
  listarTurnosDelDia,
  listarTurnosPendientesDeValidacion,
  rechazarTurno,
} from '@/modules/turnos/repositorio'
import { BotonIngreso } from '@/modules/auth/BotonIngreso'
import { useSesion } from '@/modules/auth/useSesion'
import { GrillaSemaforo, type CeldaSeleccionada } from '@/modules/predios/componentes/GrillaSemaforo'
import { GeneradorGrilla } from '@/modules/predios/componentes/GeneradorGrilla'
import { GestorCanchas } from '@/modules/canchas/componentes/GestorCanchas'
import { ModalValidacion } from '@/modules/predios/componentes/ModalValidacion'
import { Etiqueta, Pantalla, Tarjeta } from '@/modules/ui/pantalla'

const DIAS = 7

export default function DashboardDueno() {
  const sesion = useSesion()

  const [predios, setPredios] = useState<Predio[]>([])
  const [predioActivoId, setPredioActivoId] = useState<string | null>(null)
  const [fecha, setFecha] = useState(aFechaISO())
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [pendientes, setPendientes] = useState<Turno[]>([])
  const [celda, setCelda] = useState<CeldaSeleccionada | null>(null)
  const [turnoEnRevision, setTurnoEnRevision] = useState<Turno | null>(null)
  const [abrirGenerador, setAbrirGenerador] = useState(false)
  const [abrirGestorCanchas, setAbrirGestorCanchas] = useState(false)
  const [abrirConfigCobro, setAbrirConfigCobro] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [procesandoTurnoId, setProcesandoTurnoId] = useState<string | null>(null)

  const esDueno = sesion.actor !== null && sesion.actor.rol === 'dueno_predio'
  const predio = useMemo(
    () => predios.find((p) => p.id === predioActivoId) ?? predios[0] ?? null,
    [predios, predioActivoId],
  )

  const fechas = useMemo(() => {
    const hoy = aFechaISO()
    return Array.from({ length: DIAS }, (_, i) => sumarDias(hoy, i))
  }, [])

  useEffect(() => {
    if (sesion.user === null) return
    let vigente = true
    listarPrediosDelDueno(sesion.user.uid)
      .then((lista) => {
        if (!vigente) return
        setPredios(lista)
        if (lista.length > 0) setPredioActivoId((actual) => actual ?? lista[0]!.id)
      })
      .catch(() => {
        if (vigente) setError('No pudimos cargar tus predios.')
      })
    return () => {
      vigente = false
    }
  }, [sesion.user])

  const recargar = useCallback(async () => {
    if (!predio) return
    setCargando(true)
    try {
      const [delDia, cola] = await Promise.all([
        listarTurnosDelDia(predio.id, fecha),
        listarTurnosPendientesDeValidacion(predio.id),
      ])
      setTurnos(delDia)
      setPendientes(cola)
      setError(null)
    } catch {
      setError('No pudimos cargar los turnos.')
    } finally {
      setCargando(false)
    }
  }, [predio, fecha])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const manejarBloqueoManual = useCallback(async (turnoId: string) => {
    setProcesandoTurnoId(turnoId)
    // 1. Actualización optimista inmediata en la grilla: cambia a rojo (ocupado) al instante
    setTurnos((prev) =>
      prev.map((t) =>
        t.id === turnoId
          ? { ...t, estado: 'cancelado', origen: 'bloqueo_manual_dueno', canceladoPor: 'dueno' }
          : t,
      ),
    )
    // 2. Cerrar el modal inmediatamente para fluidez instantánea
    setCelda(null)

    try {
      await bloquearManualmente(turnoId)
    } catch (err) {
      console.error('Error al bloquear turno:', err)
      setError('No se pudo marcar el turno como ocupado.')
      void recargar()
    } finally {
      setProcesandoTurnoId(null)
    }
  }, [recargar])

  const manejarLiberarTurno = useCallback(async (turnoId: string) => {
    setProcesandoTurnoId(turnoId)
    // 1. Actualización optimista inmediata en la grilla: cambia a verde (disponible) al instante
    setTurnos((prev) =>
      prev.map((t) =>
        t.id === turnoId
          ? { ...t, estado: 'disponible', origen: 'carga_manual_dueno', canceladoPor: null }
          : t,
      ),
    )
    // 2. Cerrar el modal inmediatamente
    setCelda(null)

    try {
      await liberarTurno(turnoId)
    } catch (err) {
      console.error('Error al liberar turno:', err)
      setError('No se pudo liberar el turno.')
      void recargar()
    } finally {
      setProcesandoTurnoId(null)
    }
  }, [recargar])

  // Mientras haya solicitudes sin validar, la cola se refresca sola.
  useEffect(() => {
    if (pendientes.length === 0) return
    const t = setInterval(() => void recargar(), 20000)
    return () => clearInterval(t)
  }, [pendientes.length, recargar])

  if (sesion.user === null) {
    return (
      <Pantalla titulo="Panel del predio" subtitulo="Gestioná tus canchas y solicitudes.">
        <Tarjeta
          titulo="Necesitás una cuenta"
          descripcion="Este panel es para duenos y administradores de predios."
        >
          <BotonIngreso />
        </Tarjeta>
      </Pantalla>
    )
  }

  if (!esDueno) {
    return (
      <Pantalla titulo="Panel del predio">
        <div className="space-y-4">
          <p className="surface text-sm text-ink-muted">
            Tu cuenta no tiene el rol de dueno de predio. Si querés publicar una cancha, pedinos el
            alta desde el perfil.
          </p>
          <Link to="/dashboard" className="btn-ghost w-full">
            Ir a mi panel de jugador
          </Link>
        </div>
      </Pantalla>
    )
  }

  if (predios.length === 0) {
    return (
      <Pantalla titulo="Panel del predio">
        <div className="space-y-4">
          <p className="surface text-sm text-ink-muted">
            Todavía no tenés un predio validado. Por favor, andá a la sección de Ajustes y completa el "Alta de predio".
          </p>
          <Link to="/perfil" className="btn-ghost w-full">
            Ir a mis ajustes
          </Link>
        </div>
      </Pantalla>
    )
  }

  const actor = sesion.actor!

  return (
    <div className="flex h-full flex-col overflow-hidden bg-canvas">
      <Pantalla
        titulo="Panel del predio"
        subtitulo={predio?.nombre ?? ''}
        acciones={
          <span className="flex items-center gap-2 text-sm text-ink-muted">
            {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
            <button type="button" className="hover:text-ink" onClick={() => void recargar()}>
              Actualizar
            </button>
          </span>
        }
      >
      <div className="space-y-4">
        {error && <p className="surface text-sm text-occupied">{error}</p>}

        {predios.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {predios.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPredioActivoId(p.id)
                  setCelda(null)
                  setTurnoEnRevision(null)
                }}
                className={`badge ${
                  predio?.id === p.id
                    ? 'bg-pitch-faint/60 text-pitch'
                    : 'bg-ink-faint/20 text-ink-muted'
                }`}
              >
                {p.nombre}
              </button>
            ))}
          </div>
        )}

        {predio && (
          <>
            <Tarjeta
              titulo={`Solicitudes por validar (${pendientes.length})`}
              descripcion="Revisa el comprobante y aproba con un clic."
            >
              {pendientes.length === 0 ? (
                <p className="text-sm text-ink-muted">No hay solicitudes esperando.</p>
              ) : (
                <ul className="space-y-2">
                  {pendientes.map((turno) => (
                    <li key={turno.id}>
                      <button
                        type="button"
                        className="w-full rounded-xl bg-canvas px-3 py-3 text-left hover:ring-1 hover:ring-urgent"
                        onClick={() => setTurnoEnRevision(turno)}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-ink">
                            {turno.organizadorNombre ?? 'Organizador'}
                          </span>
                          <Etiqueta tono="urgent">Pendiente</Etiqueta>
                        </span>
                        <span className="mt-1 block text-xs text-ink-muted">
                          {esHoy(turno.fecha) ? 'Hoy' : formatearFechaCorta(turno.fecha)} ·{' '}
                          {turno.horaInicio} a {turno.horaFin} · sena{' '}
                          {formatearMoneda(turno.montoSena)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => setAbrirGestorCanchas(true)}
              >
                VER/EDITAR CANCHAS
              </button>
              <button
                type="button"
                className="btn-ghost border border-zinc-700 bg-zinc-900/90 hover:bg-zinc-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                onClick={() => setAbrirConfigCobro(true)}
              >
                CONFIGURAR SEÑA Y COBRO
              </button>
            </div>

            {abrirGenerador && predio && (
              <div
                className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
                role="dialog"
                aria-modal="true"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setAbrirGenerador(false)
                }}
              >
                <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-card bg-canvas-raised p-4 sm:rounded-card">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-ink">Cargar turnos a mano</h2>
                      <p className="text-sm text-ink-muted">Define franjas y repeticiones</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAbrirGenerador(false)}
                      aria-label="Cerrar"
                      className="rounded-lg p-2 text-ink-muted hover:bg-canvas hover:text-ink"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <GeneradorGrilla
                    predio={predio}
                    fecha={fecha}
                    onGenerado={async () => {
                      setAbrirGenerador(false)
                      await recargar()
                    }}
                  />
                </div>
              </div>
            )}

            <Tarjeta
              titulo={esHoy(fecha) ? 'Grilla de hoy' : `Grilla del ${formatearFechaCorta(fecha)}`}
              acciones={
                <button
                  type="button"
                  className="btn-ghost h-auto px-3 py-1.5 text-xs"
                  onClick={() => setAbrirGenerador((v) => !v)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {abrirGenerador ? 'Ocultar' : 'Cargar turnos'}
                </button>
              }
            >
              <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
                {fechas.map((dia) => (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => {
                      setFecha(dia)
                      setCelda(null)
                    }}
                    className={`min-w-[64px] shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                      fecha === dia
                        ? 'border-pitch bg-pitch-faint/30 text-pitch'
                        : 'border-ink-faint/25 text-ink-muted'
                    }`}
                  >
                    {esHoy(dia) ? 'Hoy' : formatearFechaCorta(dia)}
                  </button>
                ))}
              </div>

              <GrillaSemaforo
                canchas={canchasDe(predio)}
                turnos={turnos}
                seleccionadoId={celda?.turno.id ?? null}
                alSeleccionar={(c) => {
                  if (c?.semaforo === 'pendiente') {
                     setTurnoEnRevision(c.turno)
                     setCelda(null)
                  } else {
                     setCelda(c)
                  }
                }}
              />
            </Tarjeta>


          </>
        )}
      </div>

      {turnoEnRevision !== null && turnoEnRevision.estado === 'bloqueado_temporal' && (
        <ModalValidacion
          turno={turnoEnRevision}
          onAprobar={async (turno) => {
            const tId = turno.id
            setTurnoEnRevision(null)
            setCelda(null)
            // Actualización optimista a confirmado / reservado
            setTurnos((prev) =>
              prev.map((t) =>
                t.id === tId ? { ...t, estado: 'confirmado', comprobantePendiente: false } : t,
              ),
            )
            setPendientes((prev) => prev.filter((t) => t.id !== tId))
            try {
              await aprobarTurno(tId, actor)
            } finally {
              await recargar()
            }
          }}
          onRechazar={async (turno, motivo) => {
            const tId = turno.id
            setTurnoEnRevision(null)
            setCelda(null)
            // Actualización optimista a disponible
            setTurnos((prev) =>
              prev.map((t) =>
                t.id === tId ? { ...t, estado: 'disponible', comprobantePendiente: false } : t,
              ),
            )
            setPendientes((prev) => prev.filter((t) => t.id !== tId))
            try {
              await rechazarTurno(tId, actor, motivo)
            } finally {
              await recargar()
            }
          }}
          onCerrar={() => setTurnoEnRevision(null)}
        />
      )}

      {abrirGestorCanchas && predio && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAbrirGestorCanchas(false)
          }}
        >
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-card bg-canvas-raised p-4 sm:rounded-card">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">Gestor de Canchas</h2>
                <p className="text-sm text-ink-muted">Administra las canchas del predio</p>
              </div>
              <button
                type="button"
                onClick={() => setAbrirGestorCanchas(false)}
                aria-label="Cerrar"
                className="rounded-lg p-2 text-ink-muted hover:bg-canvas hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <GestorCanchas
              predioId={predio.id}
              onCambio={async () => {
                await recargar()
              }}
            />
          </div>
        </div>
      )}

      {celda && celda.turno.estado !== 'disponible' && celda.semaforo === 'ocupado' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && !procesandoTurnoId) setCelda(null)
          }}
        >
          <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-t-card bg-canvas-raised p-4 sm:rounded-card">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">{celda.turno.horaInicio} - {celda.turno.horaFin}</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {celda.turno.estado === 'confirmado'
                    ? `Reservado por ${celda.turno.organizadorNombre ?? 'un jugador'}. Si lo tomaste por WhatsApp o mostrador, marcalo para que nadie lo reserve.`
                    : 'Turno tomado por fuera de la app. Liberarlo lo vuelve a ofrecer.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCelda(null)}
                disabled={Boolean(procesandoTurnoId)}
                aria-label="Cerrar"
                className="rounded-lg p-2 text-ink-muted hover:bg-canvas hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {celda.turno.estado === 'confirmado' && (
                <button
                  type="button"
                  className="btn-ghost flex-1 flex items-center justify-center gap-2"
                  disabled={Boolean(procesandoTurnoId)}
                  onClick={() => void manejarBloqueoManual(celda.turno.id)}
                >
                  {procesandoTurnoId === celda.turno.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  Marcar tomado por fuera
                </button>
              )}
              {celda.turno.estado === 'cancelado' && (
                <button
                  type="button"
                  className="btn-ghost flex-1 flex items-center justify-center gap-2"
                  disabled={Boolean(procesandoTurnoId)}
                  onClick={() => void manejarLiberarTurno(celda.turno.id)}
                >
                  {procesandoTurnoId === celda.turno.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unlock className="h-4 w-4" />
                  )}
                  Liberar turno
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {celda && celda.turno.estado === 'disponible' && celda.semaforo === 'libre' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && !procesandoTurnoId) setCelda(null)
          }}
        >
          <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-t-card bg-canvas-raised p-4 sm:rounded-card">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">{celda.turno.horaInicio} - {celda.turno.horaFin}</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Este turno está libre. Si lo reservaste por fuera de la app (teléfono o mostrador), bloquéalo para evitar que lo tomen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCelda(null)}
                disabled={Boolean(procesandoTurnoId)}
                aria-label="Cerrar"
                className="rounded-lg p-2 text-ink-muted hover:bg-canvas hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={Boolean(procesandoTurnoId)}
              onClick={() => void manejarBloqueoManual(celda.turno.id)}
            >
              {procesandoTurnoId === celda.turno.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              Marcar como ocupado
            </button>
          </div>
        </div>
      )}
      {abrirConfigCobro && predio && (
        <ModalConfigCobro
          predio={predio}
          onGuardado={(nuevoCobro) => {
            setPredios((prev) =>
              prev.map((p) => (p.id === predio.id ? { ...p, cobro: nuevoCobro } : p)),
            )
          }}
          onCerrar={() => setAbrirConfigCobro(false)}
        />
      )}
    </Pantalla>
    </div>
  )
}

function ModalConfigCobro({
  predio,
  onGuardado,
  onCerrar,
}: {
  predio: Predio
  onGuardado: (nuevoCobro: Predio['cobro']) => void
  onCerrar: () => void
}) {
  const [tipoSena, setTipoSena] = useState<'fijo' | 'porcentaje'>(predio.cobro?.tipoSena ?? 'fijo')
  const [sena, setSena] = useState(String(predio.cobro?.montoSena ?? 4000))
  const [porcentaje, setPorcentaje] = useState(String(predio.cobro?.porcentajeSena ?? 50))
  const [alias, setAlias] = useState(predio.cobro?.alias ?? '')
  const [titular, setTitular] = useState(predio.cobro?.titular ?? '')
  const [cbu, setCbu] = useState(predio.cobro?.cbu ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    const montoSena = Number(sena) > 0 ? Number(sena) : 4000
    const porcentajeSena = Number(porcentaje) > 0 ? Math.min(100, Number(porcentaje)) : 50
    const cobroActualizado = {
      montoSena,
      tipoSena,
      porcentajeSena,
      alias: alias.trim(),
      titular: titular.trim(),
      cbu: cbu.trim() || null,
    }
    try {
      await actualizarCobro(predio.id, cobroActualizado)
      onGuardado(cobroActualizado)
      onCerrar()
    } catch {
      setError('No pudimos guardar los datos de cobro.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-card bg-canvas-raised p-5 sm:rounded-card">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">Configurar Seña y Cobro</h2>
            <p className="text-xs text-ink-muted">
              Define el monto que deben abonar los jugadores para congelar el turno.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-ink-muted hover:bg-canvas hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={guardar} className="space-y-4">
          {/* Modalidad de Seña */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink uppercase tracking-wide">
              Modalidad de la seña
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoSena('fijo')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  tipoSena === 'fijo'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                💵 Monto Fijo ($)
              </button>
              <button
                type="button"
                onClick={() => setTipoSena('porcentaje')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  tipoSena === 'porcentaje'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                📊 Porcentaje (%)
              </button>
            </div>
          </div>

          {tipoSena === 'fijo' ? (
            <div>
              <label className="mb-1 block text-xs font-bold text-ink" htmlFor="modal-sena">
                Monto fijo de la seña ($ por turno)
              </label>
              <input
                id="modal-sena"
                type="number"
                min="0"
                step="500"
                value={sena}
                onChange={(e) => setSena(e.target.value)}
                className="field font-bold text-pitch"
                placeholder="Ej: 4000"
                required
              />
              <p className="mt-1 text-[11px] text-ink-muted">
                Se cobrará este importe fijo para cualquier cancha (siempre que no supere el valor del turno).
              </p>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-bold text-ink" htmlFor="modal-porcentaje">
                Porcentaje del valor de la cancha (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="modal-porcentaje"
                  type="number"
                  min="5"
                  max="100"
                  step="5"
                  value={porcentaje}
                  onChange={(e) => setPorcentaje(e.target.value)}
                  className="field font-bold text-pitch w-28 text-center"
                  placeholder="Ej: 50"
                  required
                />
                <div className="flex gap-1.5 flex-1">
                  {[30, 50, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setPorcentaje(String(pct))}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                        Number(porcentaje) === pct
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-1 text-[11px] text-ink-muted">
                Ejemplo: para una cancha de $10.000 y seña del {porcentaje || 50}%, la seña será de ${((10000 * (Number(porcentaje) || 50)) / 100).toLocaleString('es-AR')}.
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold text-ink" htmlFor="modal-alias">
              Alias de cobro (Mercado Pago / Banco)
            </label>
            <input
              id="modal-alias"
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className="field font-mono"
              placeholder="Ej: complejo.futbol.mp"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-ink" htmlFor="modal-titular">
              Titular de la cuenta
            </label>
            <input
              id="modal-titular"
              type="text"
              value={titular}
              onChange={(e) => setTitular(e.target.value)}
              className="field"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-ink" htmlFor="modal-cbu">
              CBU / CVU (opcional)
            </label>
            <input
              id="modal-cbu"
              type="text"
              value={cbu}
              onChange={(e) => setCbu(e.target.value)}
              className="field font-mono text-xs"
              placeholder="22 dígitos"
            />
          </div>

          {error && <p className="text-xs text-occupied font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={guardando}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            {guardando ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </form>
      </div>
    </div>
  )
}
