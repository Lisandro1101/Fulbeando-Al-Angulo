import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Lock, Plus, Unlock, X } from 'lucide-react'
import type { Predio, Turno } from '@/domain'
import { canchasDe } from '@/domain'
import { aFechaISO, esHoy, formatearFechaCorta, formatearMoneda, sumarDias } from '@/core/tiempo'
import { listarPrediosDelDueno } from '@/modules/predios/repositorio'
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
import { NavegacionHeader } from '@/modules/ui/NavegacionHeader'

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
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div className="flex h-full flex-col overflow-hidden bg-canvas pb-safe">
      <div className="shrink-0">
        <NavegacionHeader />
      </div>
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

            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => setAbrirGestorCanchas(true)}
            >
              VER/EDITAR CANCHAS
            </button>

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
                      await recargar()
                      setAbrirGenerador(false)
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
            await aprobarTurno(turno.id, actor)
            setTurnoEnRevision(null)
            setCelda(null)
            await recargar()
          }}
          onRechazar={async (turno, motivo) => {
            await rechazarTurno(turno.id, actor, motivo)
            setTurnoEnRevision(null)
            setCelda(null)
            await recargar()
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
            if (e.target === e.currentTarget) setCelda(null)
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
                  className="btn-ghost flex-1"
                  onClick={async () => {
                    await bloquearManualmente(celda.turno.id)
                    setCelda(null)
                    await recargar()
                  }}
                >
                  <Lock className="h-4 w-4" /> Marcar tomado por fuera
                </button>
              )}
              {celda.turno.estado === 'cancelado' && (
                <button
                  type="button"
                  className="btn-ghost flex-1"
                  onClick={async () => {
                    await liberarTurno(celda.turno.id)
                    setCelda(null)
                    await recargar()
                  }}
                >
                  <Unlock className="h-4 w-4" /> Liberar turno
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
            if (e.target === e.currentTarget) setCelda(null)
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
                aria-label="Cerrar"
                className="rounded-lg p-2 text-ink-muted hover:bg-canvas hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              className="btn-primary w-full flex items-center justify-center gap-2"
              onClick={async () => {
                await bloquearManualmente(celda.turno.id)
                setCelda(null)
                await recargar()
              }}
            >
              <Lock className="h-4 w-4" /> Marcar como ocupado
            </button>
          </div>
        </div>
      )}
    </Pantalla>
    </div>
  )
}
