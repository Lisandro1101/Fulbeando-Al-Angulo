import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Building, Loader2, Lock, Plus, Trash2, Unlock, X } from 'lucide-react'
import type { Predio, Turno } from '@/domain'
import { canchasDe } from '@/domain'
import { aFechaISO, esHoy, formatearFechaCorta, formatearMoneda, sumarDias } from '@/core/tiempo'
import { actualizarCobro, listarPrediosDelDueno, obtenerPredio } from '@/modules/predios/repositorio'
import {
  aprobarTurno,
  bloquearManualmente,
  desactivarTurno,
  habilitarTurnoIndividual,
  liberarTurno,
  listarTurnosDelDia,
  listarTurnosPendientesDeValidacion,
  rechazarTurno,
} from '@/modules/turnos/repositorio'
import { collection, getDocs, query } from 'firebase/firestore'
import { db } from '@/core/firebase'
import { COLECCIONES } from '@/core/config'
import { BotonIngreso } from '@/modules/auth/BotonIngreso'
import { useSesion } from '@/modules/auth/useSesion'
import { GrillaSemaforo, type CeldaSeleccionada, type SlotVacioSeleccionado } from '@/modules/predios/componentes/GrillaSemaforo'
import { GeneradorGrilla } from '@/modules/predios/componentes/GeneradorGrilla'
import { GestorCanchas } from '@/modules/canchas/componentes/GestorCanchas'
import { ModalValidacion } from '@/modules/predios/componentes/ModalValidacion'
import { Etiqueta, Pantalla, Tarjeta } from '@/modules/ui/pantalla'
import { motion, AnimatePresence } from 'framer-motion'

const DIAS = 7

export default function DashboardDueno() {
  const sesion = useSesion()
  const location = useLocation()

  const [predios, setPredios] = useState<Predio[]>([])
  const [predioActivoId, setPredioActivoId] = useState<string | null>(null)
  const [fecha, setFecha] = useState(aFechaISO())
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [pendientes, setPendientes] = useState<Turno[]>([])
  const [celda, setCelda] = useState<CeldaSeleccionada | null>(null)
  const [slotVacio, setSlotVacio] = useState<SlotVacioSeleccionado | null>(null)
  const [habilitandoSlot, setHabilitandoSlot] = useState(false)
  const [turnoEnRevision, setTurnoEnRevision] = useState<Turno | null>(null)
  const [abrirGenerador, setAbrirGenerador] = useState(false)
  const [abrirGestorCanchas, setAbrirGestorCanchas] = useState(false)
  const [abrirConfigCobro, setAbrirConfigCobro] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [procesandoTurnoId, setProcesandoTurnoId] = useState<string | null>(null)

  const esDueno =
    sesion.actor !== null &&
    (sesion.actor.rol === 'dueno_predio' || sesion.actor.rol === 'superadmin')

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
    const cargar = async () => {
      try {
        let lista = await listarPrediosDelDueno(sesion.user!.uid)
        if (lista.length === 0 && sesion.actor?.rol === 'superadmin') {
          const snap = await getDocs(query(collection(db, COLECCIONES.predios)))
          lista = snap.docs.map((d) => d.data() as Predio).filter((p) => p.deletedAt === null)
        }
        if (!vigente) return
        setPredios(lista)
        if (lista.length > 0) setPredioActivoId((actual) => actual ?? lista[0]!.id)
      } catch {
        if (vigente) setError('No pudimos cargar tus predios.')
      }
    }
    void cargar()
    return () => {
      vigente = false
    }
  }, [sesion.user, sesion.actor?.rol])

  const recargar = useCallback(async () => {
    const targetPredioId = predioActivoId ?? predio?.id
    if (!targetPredioId) return
    setCargando(true)
    try {
      const cargarPredios = async (): Promise<Predio[]> => {
        if (!sesion.user) return []
        let lista = await listarPrediosDelDueno(sesion.user.uid)
        if (lista.length === 0 && sesion.actor?.rol === 'superadmin') {
          const snap = await getDocs(query(collection(db, COLECCIONES.predios)))
          lista = snap.docs.map((d) => d.data() as Predio).filter((p) => p.deletedAt === null)
        }
        return lista
      }

      const [delDia, cola, predioDirecto, listaPredios] = await Promise.all([
        listarTurnosDelDia(targetPredioId, fecha),
        listarTurnosPendientesDeValidacion(targetPredioId),
        obtenerPredio(targetPredioId),
        cargarPredios(),
      ])
      setTurnos(delDia)
      setPendientes(cola)

      // Actualizar predios asegurando que el activo tenga el canchasResumen más fresco
      if (listaPredios.length > 0) {
        setPredios(() => {
          const mapa = new Map(listaPredios.map((p) => [p.id, p]))
          if (predioDirecto) {
            mapa.set(predioDirecto.id, predioDirecto)
          }
          return Array.from(mapa.values())
        })
      } else if (predioDirecto) {
        setPredios((prev) => prev.map((p) => (p.id === predioDirecto.id ? predioDirecto : p)))
      }
      setError(null)
    } catch {
      setError('No pudimos cargar los turnos.')
    } finally {
      setCargando(false)
    }
  }, [predioActivoId, predio?.id, fecha, sesion.user, sesion.actor?.rol])

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

  const manejarDesactivarTurno = useCallback(async (turnoId: string) => {
    setProcesandoTurnoId(turnoId)
    // Actualización optimista: lo quita de la grilla inmediatamente (queda celda vacía / desactivada)
    setTurnos((prev) => prev.filter((t) => t.id !== turnoId))
    setCelda(null)

    try {
      await desactivarTurno(turnoId)
    } catch (err) {
      console.error('Error al desactivar turno:', err)
      setError('No se pudo desactivar el horario.')
      void recargar()
    } finally {
      setProcesandoTurnoId(null)
    }
  }, [recargar])

  const manejarHabilitarSlot = useCallback(async (slot: SlotVacioSeleccionado) => {
    if (!predio) return
    setHabilitandoSlot(true)
    const { cancha, hora } = slot

    // Optimistic UI: creamos el turno visual al instante
    const idProvisorio = `${predio.id}~${cancha.id}~${fecha}T${hora}`
    const nuevoTurnoOpt: Turno = {
      id: idProvisorio,
      predioId: predio.id,
      canchaId: cancha.id,
      fecha,
      horaInicio: hora,
      horaFin: hora,
      estado: 'disponible',
      origen: 'carga_manual_dueno',
      precioTotal: cancha.precioHora,
      montoSena: 0,
      organizadorUid: null,
      organizadorNombre: null,
      organizadorTelefono: null,
      comprobantePendiente: false,
      motivoRechazo: null,
      bloqueadoHasta: null,
      expiracionNotificada: false,
      canceladoPor: null,
      geo: predio.geo,
      partidoId: null,
      deletedAt: null,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
    }
    setTurnos((prev) => [...prev.filter((t) => !(t.canchaId === cancha.id && t.horaInicio === hora)), nuevoTurnoOpt])
    setSlotVacio(null)

    try {
      const creado = await habilitarTurnoIndividual(predio, cancha, fecha, hora)
      setTurnos((prev) => prev.map((t) => (t.id === idProvisorio ? creado : t)))
    } catch (err) {
      console.error('Error al habilitar turno:', err)
      setError('No se pudo habilitar el horario.')
      void recargar()
    } finally {
      setHabilitandoSlot(false)
    }
  }, [predio, fecha, recargar])


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
      <Pantalla titulo="Panel del predio" subtitulo="Gestioná tus canchas y solicitudes.">
        <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-4 max-w-lg mx-auto text-center shadow-lg text-slate-800">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center">
            <Building className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Todavía no tenés un predio registrado</h2>
          <p className="text-sm text-slate-500 font-medium">
            Dalo de alta para cargar tus canchas, configurar tus señas y aparecer en el radar de jugadores.
          </p>
          <Link
            to="/venue-registration"
            state={{ backgroundLocation: location }}
            className="btn-primary w-full flex items-center justify-center gap-2 font-bold py-3.5 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            Dar de alta mi primer predio
          </Link>
        </div>
      </Pantalla>
    )
  }

  const actor = sesion.actor!

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#1E0D4A]">
      <Pantalla
        titulo="Panel del predio"
        subtitulo={predio?.nombre ?? ''}
        acciones={
          <span className="flex items-center gap-2 text-sm text-indigo-200">
            {cargando && <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />}
            <button type="button" className="hover:text-emerald-300 font-semibold transition-colors cursor-pointer" onClick={() => void recargar()}>
              Actualizar
            </button>
          </span>
        }
      >
      <div className="space-y-4">
        {error && <p className="surface text-sm text-rose-600 border-rose-200 bg-rose-50/50">{error}</p>}

        {predios.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {predios.map((p) => (
              <motion.button
                key={p.id}
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setPredioActivoId(p.id)
                  setCelda(null)
                  setTurnoEnRevision(null)
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-black transition-all shadow-sm cursor-pointer ${
                  predio?.id === p.id
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/30 border border-emerald-400/40'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 hover:text-slate-950'
                }`}
              >
                {p.nombre}
              </motion.button>
            ))}

            <Link
              to="/venue-registration"
              state={{ backgroundLocation: location }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo predio
            </Link>
          </div>
        )}

        {predio && (
          <>
            <Tarjeta
              titulo={`Solicitudes por validar (${pendientes.length})`}
              descripcion="Revisa el comprobante y aproba con un clic."
            >
              {pendientes.length === 0 ? (
                <p className="text-sm text-slate-600 font-semibold">No hay solicitudes esperando.</p>
              ) : (
                <ul className="space-y-2">
                  {pendientes.map((turno) => (
                    <li key={turno.id}>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full rounded-xl bg-white hover:bg-slate-50 border border-slate-300 px-3.5 py-3 text-left hover:border-amber-400 hover:shadow-md transition-all"
                        onClick={() => setTurnoEnRevision(turno)}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-black text-slate-900">
                            {turno.organizadorNombre ?? 'Organizador'}
                          </span>
                          <Etiqueta tono="urgent">Pendiente</Etiqueta>
                        </span>
                        <span className="mt-1 block text-xs text-slate-600 font-semibold">
                          {esHoy(turno.fecha) ? 'Hoy' : formatearFechaCorta(turno.fecha)} ·{' '}
                          {turno.horaInicio} a {turno.horaFin} · seña{' '}
                          {formatearMoneda(turno.montoSena)}
                        </span>
                      </motion.button>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 px-4 rounded-xl font-black text-sm tracking-wide text-white bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                onClick={() => setAbrirGestorCanchas(true)}
              >
                VER/EDITAR CANCHAS
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 px-4 rounded-xl font-black text-sm tracking-wide text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                onClick={() => setAbrirConfigCobro(true)}
              >
                CONFIGURAR SEÑA Y COBRO
              </motion.button>
            </div>


            <Tarjeta
              titulo={esHoy(fecha) ? 'Grilla de hoy' : `Grilla del ${formatearFechaCorta(fecha)}`}
              acciones={
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 shadow-sm transition-all cursor-pointer"
                  onClick={() => setAbrirGenerador((v) => !v)}
                >
                  <Plus className="h-3.5 w-3.5 text-slate-600" />
                  {abrirGenerador ? 'Ocultar' : 'Cargar turnos'}
                </motion.button>
              }
            >
              <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
                {fechas.map((dia) => (
                  <motion.button
                    key={dia}
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setFecha(dia)
                      setCelda(null)
                    }}
                    className={`min-w-[64px] shrink-0 rounded-xl px-3.5 py-2 text-sm font-bold transition-all shadow-sm cursor-pointer ${
                      fecha === dia
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/25 border border-emerald-400/40'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 hover:text-slate-950 font-bold'
                    }`}
                  >
                    {esHoy(dia) ? 'Hoy' : formatearFechaCorta(dia)}
                  </motion.button>
                ))}
              </div>

              <GrillaSemaforo
                canchas={canchasDe(predio)}
                turnos={turnos}
                franjasBase={(predio.franjasBase ?? []).map((f) => f.horaInicio)}
                seleccionadoId={celda?.turno.id ?? null}
                alSeleccionar={(c) => {
                  if (c?.semaforo === 'pendiente') {
                     setTurnoEnRevision(c.turno)
                     setCelda(null)
                  } else {
                     setCelda(c)
                  }
                }}
                alSeleccionarVacio={(vacio) => setSlotVacio(vacio)}
              />
            </Tarjeta>

          </>
        )}
      </div>
    </Pantalla>

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
        className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 backdrop-blur-sm p-0 sm:items-center sm:p-4 animate-fade-in"
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) setAbrirGestorCanchas(false)
        }}
      >
        <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white border border-slate-200 p-5 sm:p-8 shadow-2xl text-slate-800">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Gestor de Canchas</h2>
              <p className="text-sm text-slate-500 font-medium">Administra las canchas del predio</p>
            </div>
            <button
              type="button"
              onClick={() => setAbrirGestorCanchas(false)}
              aria-label="Cerrar"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
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
        className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 backdrop-blur-sm p-0 sm:items-center sm:p-4 animate-fade-in"
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget && !procesandoTurnoId) setCelda(null)
        }}
      >
        <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-2xl text-slate-800">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">{celda.turno.horaInicio} - {celda.turno.horaFin}</h2>
              <p className="mt-1 text-sm text-slate-600 font-medium">
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
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              {celda.turno.estado === 'confirmado' && (
                <button
                  type="button"
                  className="btn-ghost flex-1 flex items-center justify-center gap-2 font-bold cursor-pointer"
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
                  className="btn-ghost flex-1 flex items-center justify-center gap-2 font-bold cursor-pointer"
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
            <button
              type="button"
              className="btn-ghost w-full flex items-center justify-center gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 text-xs font-bold cursor-pointer"
              disabled={Boolean(procesandoTurnoId)}
              onClick={() => void manejarDesactivarTurno(celda.turno.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Desactivar horario (quitar de la grilla)
            </button>
          </div>
        </div>
      </div>
    )}

    {celda && celda.turno.estado === 'disponible' && celda.semaforo === 'libre' && (
      <div
        className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 backdrop-blur-sm p-0 sm:items-center sm:p-4 animate-fade-in"
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget && !procesandoTurnoId) setCelda(null)
        }}
      >
        <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-2xl text-slate-800">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">{celda.turno.horaInicio} - {celda.turno.horaFin}</h2>
              <p className="mt-1 text-sm text-slate-600 font-medium">
                Este turno está libre. Si lo reservaste por fuera de la app (teléfono o mostrador), bloquéalo para evitar que lo tomen.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCelda(null)}
              disabled={Boolean(procesandoTurnoId)}
              aria-label="Cerrar"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="btn-primary w-full flex items-center justify-center gap-2 font-bold cursor-pointer"
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
            <button
              type="button"
              className="btn-ghost w-full flex items-center justify-center gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 text-xs font-bold cursor-pointer"
              disabled={Boolean(procesandoTurnoId)}
              onClick={() => void manejarDesactivarTurno(celda.turno.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Desactivar horario (quitar de la grilla)
            </button>
          </div>
        </div>
      </div>
    )}

    {slotVacio && (
      <div
        className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 backdrop-blur-sm p-0 sm:items-center sm:p-4 animate-fade-in"
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget && !habilitandoSlot) setSlotVacio(null)
        }}
      >
        <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-2xl text-slate-800">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Habilitar Horario</h2>
              <p className="mt-1 text-sm text-slate-600 font-medium">
                Cancha <span className="font-bold text-slate-900">{slotVacio.cancha.nombre}</span> a las{' '}
                <span className="font-bold text-slate-900">{slotVacio.hora}</span> ({esHoy(fecha) ? 'Hoy' : formatearFechaCorta(fecha)})
              </p>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                Precio de lista: {formatearMoneda(slotVacio.cancha.precioHora)} por turno
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSlotVacio(null)}
              disabled={habilitandoSlot}
              aria-label="Cerrar"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="btn-primary w-full flex items-center justify-center gap-2 font-bold cursor-pointer"
              disabled={habilitandoSlot}
              onClick={() => void manejarHabilitarSlot(slotVacio)}
            >
              {habilitandoSlot ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Habilitar este turno
            </button>
            <button
              type="button"
              className="btn-ghost w-full font-bold cursor-pointer"
              disabled={habilitandoSlot}
              onClick={() => {
                setSlotVacio(null)
                setAbrirGenerador(true)
              }}
            >
              Cargar turnos masivos...
            </button>
          </div>
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

    {abrirGenerador && predio && (
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6 animate-fade-in"
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) setAbrirGenerador(false)
        }}
      >
        <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-2xl text-slate-800 my-auto">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Cargar turnos a mano</h2>
              <p className="text-sm text-slate-500 font-medium">Define franjas y repeticiones</p>
            </div>
            <button
              type="button"
              onClick={() => setAbrirGenerador(false)}
              aria-label="Cerrar"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
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
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 backdrop-blur-sm p-0 sm:items-center sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white border border-slate-200 p-5 sm:p-8 shadow-2xl text-slate-800">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Configurar Seña y Cobro</h2>
            <p className="text-xs text-slate-500 font-medium">
              Define el monto que deben abonar los jugadores para congelar el turno.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={guardar} className="space-y-4">
          {/* Modalidad de Seña */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wide">
              Modalidad de la seña
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoSena('fijo')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  tipoSena === 'fijo'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                    : 'border-slate-300 bg-slate-100 text-slate-800 hover:text-slate-950 hover:bg-slate-200'
                }`}
              >
                💵 Monto Fijo ($)
              </button>
              <button
                type="button"
                onClick={() => setTipoSena('porcentaje')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  tipoSena === 'porcentaje'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                    : 'border-slate-300 bg-slate-100 text-slate-800 hover:text-slate-950 hover:bg-slate-200'
                }`}
              >
                📊 Porcentaje (%)
              </button>
            </div>
          </div>

          {tipoSena === 'fijo' ? (
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor="modal-sena">
                Monto fijo de la seña ($ por turno)
              </label>
              <input
                id="modal-sena"
                type="number"
                min="0"
                step="500"
                value={sena}
                onChange={(e) => setSena(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Ej: 4000"
                required
              />
              <p className="mt-1 text-[11px] text-slate-600 font-semibold">
                Se cobrará este importe fijo para cualquier cancha (siempre que no supere el valor del turno).
              </p>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor="modal-porcentaje">
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
                  className="w-28 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 text-center placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="Ej: 50"
                  required
                />
                <div className="flex gap-1.5 flex-1">
                  {[30, 50, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setPorcentaje(String(pct))}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                        Number(porcentaje) === pct
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                          : 'border-slate-300 bg-slate-100 text-slate-800 hover:text-slate-950 hover:bg-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-1 text-[11px] text-slate-600 font-semibold">
                Ejemplo: para una cancha de $10.000 y seña del {porcentaje || 50}%, la seña será de ${((10000 * (Number(porcentaje) || 50)) / 100).toLocaleString('es-AR')}.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor="modal-alias">
                Alias de cobro (Mercado Pago / Banco)
              </label>
              <input
                id="modal-alias"
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Ej: complejo.futbol.mp"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor="modal-titular">
                Titular de la cuenta
              </label>
              <input
                id="modal-titular"
                type="text"
                value={titular}
                onChange={(e) => setTitular(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Ej: Juan Pérez"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor="modal-cbu">
              CBU / CVU (opcional)
            </label>
            <input
              id="modal-cbu"
              type="text"
              value={cbu}
              onChange={(e) => setCbu(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              placeholder="22 dígitos"
            />
          </div>

          {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-bold">{error}</p>}

          <button
            type="submit"
            disabled={guardando}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 cursor-pointer"
          >
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            {guardando ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </form>
      </div>
    </div>
  )
}
