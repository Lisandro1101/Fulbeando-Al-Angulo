import { useState } from 'react'
import { Check, Loader2, Radar, X } from 'lucide-react'
import type { Posicion, Turno } from '@/domain'
import { formatearFechaCorta, formatearMoneda } from '@/core/tiempo'

const POSICIONES: Array<Posicion | 'cualquiera'> = [
  'cualquiera',
  'arquero',
  'defensor',
  'medio',
  'delantero',
]

const ETIQUETA: Record<Posicion | 'cualquiera', string> = {
  cualquiera: 'Cualquier posicion',
  arquero: 'Arquero',
  defensor: 'Defensor',
  medio: 'Medio',
  delantero: 'Delantero',
}

/**
 * Activacion del radar "Falta 1" (regla 6.2). El permiso lo resuelve
 * `puedeActivarRadar` en el dominio y lo vuelven a validar las rules.
 */
export function ModalActivarRadar({
  turno,
  onActivar,
  onCerrar,
}: {
  turno: Turno
  onActivar: (params: {
    cantidadRequeridos: number
    posicionBuscada: Posicion | 'cualquiera'
    notas: string | null
  }) => Promise<void>
  onCerrar: () => void
}) {
  const [cantidad, setCantidad] = useState(1)
  const [posicion, setPosicion] = useState<Posicion | 'cualquiera'>('cualquiera')
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Activar radar de suplentes"
      onClick={(e) => {
        if (e.target === e.currentTarget && !enviando) onCerrar()
      }}
    >
      <form
        className="w-full max-w-md rounded-t-card bg-canvas-raised p-4 sm:rounded-card"
        onSubmit={async (e) => {
          e.preventDefault()
          setEnviando(true)
          setError(null)
          try {
            await onActivar({
              cantidadRequeridos: cantidad,
              posicionBuscada: posicion,
              notas: notas.trim().length > 0 ? notas.trim() : null,
            })
          } catch (err) {
            setError(err instanceof Error ? err.message : 'No pudimos activar el radar.')
            setEnviando(false)
          }
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-ink">
              <Radar className="h-5 w-5 text-urgent" /> Falta 1
            </h2>
            <p className="text-sm text-ink-muted">
              {formatearFechaCorta(turno.fecha)} · {turno.horaInicio} a {turno.horaFin}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-ink-muted hover:bg-canvas hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-ink-muted">
          Se avisa a los jugadores disponibles que esten cerca del predio. La sena ya fue
          validada ({formatearMoneda(turno.montoSena)}), asi que solo falta armar el equipo.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-ink-muted" htmlFor="radar-cantidad">
              Cuantos faltan
            </label>
            <input
              id="radar-cantidad"
              className="field"
              type="number"
              min={1}
              max={11}
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-muted" htmlFor="radar-posicion">
              Posicion
            </label>
            <select
              id="radar-posicion"
              className="field"
              value={posicion}
              onChange={(e) => setPosicion(e.target.value as Posicion | 'cualquiera')}
            >
              {POSICIONES.map((p) => (
                <option key={p} value={p}>
                  {ETIQUETA[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs text-ink-muted" htmlFor="radar-notas">
            Notas (opcional)
          </label>
          <input
            id="radar-notas"
            className="field"
            placeholder="Ej: nivel amateur, con bringing"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>

        {error && <p className="mt-3 text-sm text-occupied">{error}</p>}

        <button type="submit" className="btn-urgent mt-4 w-full" disabled={enviando}>
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Activar radar
        </button>
      </form>
    </div>
  )
}
