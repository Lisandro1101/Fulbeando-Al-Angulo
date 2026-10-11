import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  collection,
  getCountFromServer,
  query,
  Timestamp,
  where,
  type CollectionReference,
  type Query,
} from 'firebase/firestore'
import { BadgeCheck, Loader2, LogOut, ShieldCheck, X } from 'lucide-react'
import type { Predio, SolicitudDueno } from '@/domain'
import { Etiqueta, Pantalla, Tarjeta } from '@/modules/ui/pantalla'
import { BotonIngreso } from '@/modules/auth/BotonIngreso'
import { useSesion } from '@/modules/auth/useSesion'
import { cerrarSesion } from '@/modules/auth/servicio'
import { COLECCIONES } from '@/core/config'
import { db } from '@/core/firebase'
import {
  aprobarSolicitud,
  listarSolicitudes,
  rechazarSolicitud,
} from '@/modules/solicitudes/repositorio'
import { listarPrediosParaVerificar, verificarPredio } from '@/modules/predios/repositorio'
import { aDate } from '@/core/firestore'

/**
 * Conteo sin bajar los documentos. Devuelve `null` (y no rompe la pantalla)
 * si las reglas dejan sin contar alguna coleccion.
 */
const contar = async (ref: CollectionReference | Query): Promise<number | null> => {
  try {
    return (await getCountFromServer(ref)).data().count
  } catch (err) {
    console.error('No pude contar:', err)
    return null
  }
}

/** `null` (conteo rechazado) se muestra como guion, nunca como cero inventado. */
const n = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : String(v)

/**
 * Panel del superadmin: aprueba solicitudes de dueno y verifica predios. Es el
 * unico actor que puede tocar roles, y por eso el alta de canchas depende de
 * que pase por aca.
 */
export default function PanelSuperadmin() {
  const sesion = useSesion()
  const [solicitudes, setSolicitudes] = useState<SolicitudDueno[]>([])
  const [predios, setPredios] = useState<Predio[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rechazando, setRechazando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [metricas, setMetricas] = useState<{
    usuarios: number | null
    usuariosSemana: number | null
    partidos: number | null
    reportes: number | null
    prediosOk: number | null
    prediosPend: number | null
  } | null>(null)
  const navigate = useNavigate()

  const esSuperadmin = sesion.actor?.rol === 'superadmin'

  const salir = async () => {
    await cerrarSesion()
    navigate('/login')
  }

  const cargar = useCallback(async () => {
    if (!esSuperadmin) return
    setOcupado(true)
    try {
      const hace7d = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const [
        cola,
        aVerificar,
        usuarios,
        usuariosSemana,
        partidos,
        reportes,
        prediosOk,
        prediosPend,
      ] = await Promise.all([
        listarSolicitudes('pendiente'),
        listarPrediosParaVerificar(),
        contar(collection(db, COLECCIONES.usuarios)),
        contar(query(collection(db, COLECCIONES.usuarios), where('createdAt', '>=', hace7d))),
        contar(collection(db, COLECCIONES.partidos)),
        contar(query(collection(db, COLECCIONES.reportes), where('estado', '==', 'abierto'))),
        contar(query(collection(db, COLECCIONES.predios), where('verificado', '==', true))),
        contar(query(collection(db, COLECCIONES.predios), where('verificado', '==', false))),
      ])
      setSolicitudes(cola)
      setPredios(aVerificar)
      setMetricas({ usuarios, usuariosSemana, partidos, reportes, prediosOk, prediosPend })
      setError(null)
    } catch (err) {
      console.error('Error al cargar panel superadmin:', err)
      setError(err instanceof Error ? err.message : 'No pudimos cargar la cola de revision.')
    } finally {
      setOcupado(false)
    }
  }, [esSuperadmin])

  useEffect(() => {
    void cargar()
  }, [cargar])

  if (sesion.user === null) {
    return (
      <Pantalla titulo="Panel de administracion">
        <Tarjeta titulo="Necesitás una cuenta">
          <BotonIngreso />
        </Tarjeta>
      </Pantalla>
    )
  }

  if (!esSuperadmin) {
    return (
      <Pantalla titulo="Panel de administracion">
        <div className="space-y-4">
          <p className="surface text-sm text-ink-muted">
            Esta seccion es solo para el superadmin.
          </p>
          <Link to="/" className="btn-ghost w-full">
            Volver al inicio
          </Link>
        </div>
      </Pantalla>
    )
  }

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente')
  const sinVerificar = predios.filter((p) => !p.verificado)
  return (
    <Pantalla
      titulo="Panel de administracion"
      subtitulo="Solicitudes de dueno y verificacion de predios"
      acciones={
        <div className="flex items-center gap-2">
          {ocupado && <Loader2 className="h-4 w-4 animate-spin text-ink-muted" />}
          {/* Este rol no puede salir a la app (gate de /superadmin): sin este
              boton no habria forma de cerrar sesion. */}
          <button type="button" onClick={() => void salir()} className="btn-ghost shrink-0">
            <LogOut className="h-4 w-4" />
            <span>Cerrar Sesion</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <p className="surface text-sm text-occupied">{error}</p>}

        {/* El modulo de KPIs original del dashboard, con los numeros reales de
            Firestore (en desarrollo, del emulador). "Conflictos a Arbitrar" y
            "Canchas Premium" no existian en el modelo: se reemplazaron por lo
            que si se mide. */}
        <section className="rounded-xl border border-pitch-700 bg-[#05080E] p-6 shadow-lg">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-white">Vision General</h3>
            <span className="text-xs font-semibold text-neon-green">
              {metricas === null ? 'contando...' : 'conteos en vivo de Firestore'}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative overflow-hidden rounded-xl border border-pitch-700 bg-pitch-900 p-5 shadow-lg">
              <div className="absolute top-0 left-0 h-full w-1 bg-neon-green" />
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                Usuarios Totales
              </p>
              <p className="text-3xl font-black text-white">{n(metricas?.usuarios)}</p>
              <p className="mt-2 text-xs text-neon-green">
                +{n(metricas?.usuariosSemana)} esta semana
              </p>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-pitch-700 bg-pitch-900 p-5 shadow-lg">
              <div className="absolute top-0 left-0 h-full w-1 bg-blue-500" />
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                Partidos Jugados
              </p>
              <p className="text-3xl font-black text-white">{n(metricas?.partidos)}</p>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-pitch-700 bg-pitch-900 p-5 shadow-lg">
              <div className="absolute top-0 left-0 h-full w-1 bg-red-500" />
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                Reportes abiertos
              </p>
              <p className="text-3xl font-black text-white">{n(metricas?.reportes)}</p>
              <p className="mt-2 text-xs text-red-500">Accion requerida urgente</p>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-pitch-700 bg-pitch-900 p-5 shadow-lg">
              <div className="absolute top-0 left-0 h-full w-1 bg-purple-500" />
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                Predios verificados
              </p>
              <p className="text-3xl font-black text-white">{n(metricas?.prediosOk)}</p>
              <p className="mt-2 text-xs text-purple-400">
                {n(metricas?.prediosPend)} sin verificar
              </p>
            </div>
          </div>
        </section>

        <Tarjeta
          titulo={`Solicitudes de dueno (${pendientes.length})`}
          descripcion="Aprobar activa el plan del dueno: recien ahi puede entrar a su panel. El rol ya lo tiene desde el registro."
        >
          {pendientes.length === 0 ? (
            <p className="text-sm text-ink-muted">No hay solicitudes esperando.</p>
          ) : (
            <ul className="space-y-3">
              {pendientes.map((s) => (
                <li key={s.uid} className="rounded-xl bg-canvas p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        {s.nombre} {s.apellido}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {s.nombrePredio} · {s.barrio}, {s.ciudad}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {s.cantidadCanchas} cancha{s.cantidadCanchas === 1 ? '' : 's'} {s.tipoCancha}{' '}
                        · {s.telefono} · {s.email}
                      </p>
                    </div>
                    <Etiqueta tono="urgent">Pendiente</Etiqueta>
                  </div>

                  {s.mensaje.trim().length > 0 && (
                    <p className="mt-2 rounded-lg bg-canvas-raised px-2 py-1.5 text-xs text-ink-muted">
                      {s.mensaje}
                    </p>
                  )}

                  {rechazando === s.uid ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        className="field min-h-16 text-sm"
                        placeholder="Motivo del rechazo (lo ve el usuario)"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-danger flex-1"
                          onClick={async () => {
                            await rechazarSolicitud(s.uid, sesion.user!.uid, motivo)
                            setRechazando(null)
                            setMotivo('')
                            await cargar()
                          }}
                        >
                          Confirmar rechazo
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            setRechazando(null)
                            setMotivo('')
                          }}
                          aria-label="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="btn-primary flex-1"
                        onClick={async () => {
                          await aprobarSolicitud(s.uid, sesion.user!.uid)
                          await cargar()
                        }}
                      >
                        <ShieldCheck className="h-4 w-4" /> Activar plan
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => {
                          setRechazando(s.uid)
                          setMotivo('')
                        }}
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Predios sin verificar"
          descripcion="Un predio verificado es el unico que aparece en el mapa y acepta reservas."
        >
          {sinVerificar.length === 0 ? (
            <p className="text-sm text-ink-muted">No hay predios esperando verificacion.</p>
          ) : (
            <ul className="space-y-2">
              {sinVerificar.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{p.nombre}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {p.direccion} · {p.barrio} · alta {(aDate(p.createdAt) ?? new Date()).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost h-9 shrink-0 px-3 text-xs"
                    onClick={async () => {
                      await verificarPredio(p.id, true)
                      await cargar()
                    }}
                  >
                    <BadgeCheck className="h-4 w-4" /> Verificar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>
    </Pantalla>
  )
}
