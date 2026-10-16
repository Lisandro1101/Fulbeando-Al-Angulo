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
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-2xl text-slate-800"
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
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <Radar className="h-5 w-5 text-amber-500" /> Falta 1
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              {formatearFechaCorta(turno.fecha)} · {turno.horaInicio} a {turno.horaFin}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600 font-medium">
          Se avisa a los jugadores disponibles que estén cerca del predio. La seña ya fue
          validada (<span className="font-bold text-slate-900">{formatearMoneda(turno.montoSena)}</span>), así que solo falta armar el equipo.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor="radar-cantidad">
              Cuántos faltan
            </label>
            <input
              id="radar-cantidad"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 shadow-sm"
              type="number"
              min={1}
              max={11}
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor="radar-posicion">
              Posición
            </label>
            <select
              id="radar-posicion"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 shadow-sm"
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
          <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor="radar-notas">
            Notas (opcional)
          </label>
          <input
            id="radar-notas"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500 shadow-sm"
            placeholder="Ej: nivel amateur, con buena onda"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>

        {error && <p className="mt-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-bold">{error}</p>}

        <button type="submit" className="btn-urgent mt-4 w-full font-black cursor-pointer shadow-lg shadow-amber-500/20" disabled={enviando}>
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Activar radar
        </button>
      </form>
    </div>
  )
}
