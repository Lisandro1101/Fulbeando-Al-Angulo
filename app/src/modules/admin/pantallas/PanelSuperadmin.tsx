import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Loader2, ShieldCheck, X } from 'lucide-react'
import type { Predio, SolicitudDueno } from '@/domain'
import { Etiqueta, Pantalla, Tarjeta } from '@/modules/ui/pantalla'
import { BotonIngreso } from '@/modules/auth/BotonIngreso'
import { useSesion } from '@/modules/auth/useSesion'
import {
  aprobarSolicitud,
  listarSolicitudes,
  rechazarSolicitud,
} from '@/modules/solicitudes/repositorio'
import { listarPrediosParaVerificar, verificarPredio } from '@/modules/predios/repositorio'
import { aDate } from '@/core/firestore'

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

  const esSuperadmin = sesion.actor?.rol === 'superadmin'

  const cargar = useCallback(async () => {
    if (!esSuperadmin) return
    setOcupado(true)
    try {
      const [cola, aVerificar] = await Promise.all([
        listarSolicitudes('pendiente'),
        listarPrediosParaVerificar(),
      ])
      setSolicitudes(cola)
      setPredios(aVerificar)
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
        ocupado ? <Loader2 className="h-4 w-4 animate-spin text-ink-muted" /> : undefined
      }
    >
      <div className="space-y-4">
        {error && <p className="surface text-sm text-occupied">{error}</p>}

        <Tarjeta
          titulo={`Solicitudes de dueno (${pendientes.length})`}
          descripcion="Aprobar habilita el rol dueno_predio: recien ahi el usuario puede dar de alta canchas."
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
                        <ShieldCheck className="h-4 w-4" /> Aprobar
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
