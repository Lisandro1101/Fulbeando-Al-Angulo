import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Loader2, Radar } from 'lucide-react'
import type { Alerta, Turno } from '@/domain'
import { estaActiva } from '@/domain'
import { aFechaISO, esHoy, formatearFechaCorta } from '@/core/tiempo'
import { useSesion } from '@/modules/auth/useSesion'
import { BotonIngreso } from '@/modules/auth/BotonIngreso'
import { listarTurnosDelOrganizador } from '@/modules/turnos/repositorio'
import { crearAlerta, obtenerAlertaDeTurno, listarAlertasCercanas } from '@/modules/alertas/repositorio'
import { ModalActivarRadar } from '@/modules/alertas/componentes/ModalActivarRadar'
import { TarjetaAlerta } from '@/modules/alertas/componentes/TarjetaAlerta'
import { Etiqueta, Pantalla, Tarjeta } from '@/modules/ui/pantalla'
import { NavegacionHeader } from '@/modules/ui/NavegacionHeader'

/** Dashboard del Jugador (PRD 4.2): radar de emergencia + mis próximos partidos. */
export default function DashboardJugador() {
  const sesion = useSesion()
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [alertas, setAlertas] = useState<Array<Alerta & { distanciaKm: number }>>([])
  const [radarPorTurno, setRadarPorTurno] = useState<Record<string, string>>({})
  const [activando, setActivando] = useState<Turno | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const usuario = sesion.usuario
  const actor = sesion.actor

  const cargar = useCallback(async () => {
    if (usuario === null) return
    setCargando(true)
    try {
      const hoy = aFechaISO()
      const proximos = await listarTurnosDelOrganizador(usuario.uid, hoy)

      // El radar necesita una zona: sin ubicacion no hay consulta posible.
      let cercanas: Array<Alerta & { distanciaKm: number }> = []
      if (usuario.geo !== null) {
        cercanas = await listarAlertasCercanas({ lat: usuario.geo.lat, lng: usuario.geo.lng }, { fecha: hoy })
      }

      // Si el radar ya esta activo se resuelve por turno (1 query por confirmado).
      const conRadar: Record<string, string> = {}
      for (const turno of proximos.filter((t) => t.estado === 'confirmado')) {
        const alerta = await obtenerAlertaDeTurno(turno.id)
        if (alerta !== null && estaActiva(alerta, Date.now())) conRadar[turno.id] = alerta.id
      }

      setTurnos(proximos)
      setAlertas(cercanas)
      setRadarPorTurno(conRadar)
      setError(null)
    } catch {
      setError('No pudimos cargar tu panel.')
    } finally {
      setCargando(false)
    }
  }, [usuario])

  useEffect(() => {
    void cargar()
  }, [cargar])

  if (sesion.user === null) {
    return (
      <Pantalla titulo="Mi Dia" subtitulo="Partidos de hoy cerca tuyo y tus proximos turnos.">
        <div className="space-y-4">
          <Tarjeta titulo="Necesitás una cuenta" descripcion="Para ver el radar y reservar.">
            <BotonIngreso />
          </Tarjeta>
          <Link className="btn-ghost w-full" to="/">
            Volver al inicio
          </Link>
        </div>
      </Pantalla>
    )
  }

  if (usuario === null || actor === null) {
    return (
      <Pantalla titulo="Mi Dia">
        <p className="surface flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando tu panel...
        </p>
      </Pantalla>
    )
  }

  const sinGeo = usuario.geo === null

  return (
    <div className="min-h-full bg-canvas pb-safe">
      <NavegacionHeader />
      <Pantalla
        titulo="Mi Día"
        subtitulo="Partidos de hoy cerca tuyo y tus próximos turnos."
        acciones={cargando ? <Loader2 className="h-4 w-4 animate-spin text-ink-muted" /> : undefined}
      >
      <div className="space-y-4 pb-20">
        {error && <p className="surface text-sm text-occupied">{error}</p>}

        <Tarjeta
          titulo="Radar de Emergencia"
          descripcion="Partidos de hoy que necesitan jugadores. Filtra por proximidad."
        >
          {sinGeo ? (
            <div className="space-y-3">
              <p className="flex items-start gap-2 text-sm text-urgent">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Falta tu ubicacion aproximada para buscar partidos cerca tuyo.
              </p>
              <Link to="/ajustes" className="btn-ghost w-full">
                Cargar mi ubicacion
              </Link>
            </div>
          ) : alertas.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No hay partidos buscando gente cerca tuyo hoy. Volvé mas tarde.
            </p>
          ) : (
            <ul className="space-y-2">
              {alertas.map((alerta) => (
                <TarjetaAlerta
                  key={alerta.id}
                  alerta={alerta}
                  uid={usuario.uid}
                  posicion={usuario.perfilDeportivo?.posicion ?? null}
                  nombre={`${usuario.nombre} ${usuario.apellido}`.trim()}
                  puedeConfirmar={alerta.creadoPorUid === usuario.uid}
                  onCambio={cargar}
                />
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Mis Proximos Partidos"
          descripcion="Turnos que organizaste. Si falta gente, activa el radar."
        >
          {turnos.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Todavia no reservaste ningun turno.{' '}
              <Link to="/" className="text-pitch underline">
                Buscar cancha
              </Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {turnos.map((turno) => {
                const alertaId = radarPorTurno[turno.id]
                const confirmada = turno.estado === 'confirmado'
                return (
                  <li key={turno.id} className="rounded-xl bg-canvas p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">
                          {esHoy(turno.fecha) ? 'Hoy' : formatearFechaCorta(turno.fecha)} ·{' '}
                          {turno.horaInicio} a {turno.horaFin}
                        </p>
                        <p className="text-xs text-ink-muted">{turno.organizadorNombre}</p>
                      </div>
                      <Etiqueta
                        tono={
                          turno.estado === 'confirmado'
                            ? 'pitch'
                            : turno.estado === 'bloqueado_temporal'
                              ? 'urgent'
                              : 'mute'
                        }
                      >
                        {turno.estado === 'confirmado'
                          ? 'Confirmado'
                          : turno.estado === 'bloqueado_temporal'
                            ? 'Esperando dueno'
                            : 'Cancelado'}
                      </Etiqueta>
                    </div>

                    {turno.estado === 'bloqueado_temporal' && turno.motivoRechazo !== null && (
                      <p className="mt-2 text-xs text-occupied">
                        Motivo del rechazo: {turno.motivoRechazo}
                      </p>
                    )}

                    {confirmada && (
                      <div className="mt-3">
                        {alertaId !== undefined ? (
                          <p className="text-xs text-ink-muted">
                            Radar activo. Te avisamos cuando se sumen.
                          </p>
                        ) : (
                          <button
                            type="button"
                            className="btn-urgent h-9 px-3 text-xs"
                            onClick={() => setActivando(turno)}
                          >
                            <Radar className="h-3.5 w-3.5" /> Activar Falta 1
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Tarjeta>
      </div>

      <Link
        className="btn-primary fixed inset-x-4 bottom-4 z-30 shadow-glow"
        to="/reservar"
      >
        Reservar Turno
      </Link>

      {activando !== null && (
        <ModalActivarRadar
          turno={activando}
          onCerrar={() => setActivando(null)}
          onActivar={async (params) => {
            await crearAlerta(activando, actor, params)
            setActivando(null)
            await cargar()
          }}
        />
      )}
    </Pantalla>
    </div>
  )
}
