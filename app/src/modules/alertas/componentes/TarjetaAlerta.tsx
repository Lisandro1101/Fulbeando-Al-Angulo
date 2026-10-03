import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, MapPin, Users, X } from 'lucide-react'
import type { Alerta, Postulacion } from '@/domain'
import { faltanJugadores, estaActiva } from '@/domain'
import { formatearFechaCorta } from '@/core/tiempo'
import {
  confirmarSuplente,
  listarPostulaciones,
  postularse,
  rechazarSuplente,
  renunciarPostulacion,
} from '@/modules/alertas/repositorio'

/**
 * Tarjeta de una alerta "Falta 1" dentro del radar. El jugador se postula con
 * un toque; quien creo la alerta confirma a quien sumo. Nadie ve comprobantes
 * ni datos de contacto: eso es del organizador.
 */
export function TarjetaAlerta({
  alerta,
  uid,
  puedeConfirmar,
  posicion,
  nombre,
  onCambio,
}: {
  alerta: Alerta & { distanciaKm?: number }
  uid: string
  puedeConfirmar: boolean
  posicion: Postulacion['posicion']
  nombre: string
  onCambio: () => void | Promise<void>
}) {
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([])
  const [miEstado, setMiEstado] = useState<Postulacion['estado'] | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verPostulantes, setVerPostulantes] = useState(puedeConfirmar)

  const cargar = useCallback(async () => {
    try {
      const lista = await listarPostulaciones(alerta.id)
      setPostulaciones(lista)
      setMiEstado(lista.find((p) => p.uid === uid)?.estado ?? null)
    } catch {
      setError('No pudimos cargar los postulantes.')
    }
  }, [alerta.id, uid])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const activa = estaActiva(alerta, Date.now())
  const completa = !faltanJugadores(alerta)
  const pendienteDeMi = miEstado === 'postulado'

  const sumar = async () => {
    setOcupado(true)
    setError(null)
    try {
      await postularse(alerta.id, { uid, nombre, posicion })
      await cargar()
      await onCambio()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos sumarte.')
    } finally {
      setOcupado(false)
    }
  }

  const salir = async () => {
    setOcupado(true)
    try {
      await renunciarPostulacion(alerta.id, uid)
      await cargar()
      await onCambio()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <li className="rounded-xl bg-canvas p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {formatearFechaCorta(alerta.fecha)} · {alerta.horaInicio} a {alerta.horaFin}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {alerta.cantidadRequeridos === 1
              ? 'Falta 1'
              : `Faltan ${alerta.cantidadRequeridos - alerta.confirmados}`}
            {alerta.posicionBuscada !== 'cualquiera' && ` · ${alerta.posicionBuscada}`}
            {alerta.distanciaKm !== undefined && (
              <span className="ml-1 inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" /> {alerta.distanciaKm.toFixed(1)} km
              </span>
            )}
          </p>
        </div>
        <span className="badge shrink-0 bg-urgent-faint/60 text-urgent">
          <Users className="h-3 w-3" />
          {alerta.confirmados}/{alerta.cantidadRequeridos}
        </span>
      </div>

      {alerta.notas !== null && (
        <p className="mt-2 rounded-lg bg-canvas-raised px-2 py-1.5 text-xs text-ink-muted">
          {alerta.notas}
        </p>
      )}

      {error && <p className="mt-2 text-xs text-occupied">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {puedeConfirmar && (
          <button
            type="button"
            className="btn-ghost h-9 px-3 text-xs"
            onClick={() => setVerPostulantes((v) => !v)}
          >
            {verPostulantes ? 'Ocultar' : 'Ver'} postulantes
          </button>
        )}

        {!puedeConfirmar && activa && !completa && (
          <>
            {pendienteDeMi ? (
              <button
                type="button"
                className="btn-ghost h-9 px-3 text-xs"
                onClick={() => void salir()}
                disabled={ocupado}
              >
                {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Me bajo
              </button>
            ) : (
              <button
                type="button"
                className="btn-urgent h-9 px-3 text-xs"
                onClick={() => void sumar()}
                disabled={ocupado || miEstado === 'confirmado'}
              >
                {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {miEstado === 'confirmado' ? 'Ya estas Inside' : 'Me sumo'}
              </button>
            )}
          </>
        )}

        {miEstado === 'confirmado' && (
          <span className="badge bg-pitch-faint/60 text-pitch">
            <Check className="h-3 w-3" /> Estas en el equipo
          </span>
        )}
      </div>

      {puedeConfirmar && verPostulantes && (
        <ul className="mt-3 space-y-1.5">
          {postulaciones.length === 0 ? (
            <li className="text-xs text-ink-muted">Todavia nadie se sumo.</li>
          ) : (
            postulaciones
              .filter((p) => p.estado === 'postulado')
              .map((p) => (
                <li
                  key={p.uid}
                  className="flex items-center justify-between gap-2 rounded-lg bg-canvas-raised px-2.5 py-2"
                >
                  <span className="min-w-0 text-xs text-ink">
                    {p.nombre}
                    {p.posicion !== null && (
                      <span className="text-ink-muted"> · {p.posicion}</span>
                    )}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label={`Confirmar a ${p.nombre}`}
                      className="btn-ghost h-8 w-8 px-0"
                      onClick={async () => {
                        await confirmarSuplente(alerta.id, p.uid)
                        await cargar()
                        await onCambio()
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Rechazar a ${p.nombre}`}
                      className="btn-ghost h-8 w-8 px-0"
                      onClick={async () => {
                        await rechazarSuplente(alerta.id, p.uid)
                        await cargar()
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                </li>
              ))
          )}
        </ul>
      )}
    </li>
  )
}
