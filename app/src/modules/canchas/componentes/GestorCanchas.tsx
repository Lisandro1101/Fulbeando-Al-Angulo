import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, X } from 'lucide-react'
import type { Cancha, TipoCancha } from '@/domain'
import { TIPOS_CANCHA, etiquetaCancha } from '@/domain'
import { formatearMoneda } from '@/core/tiempo'
import {
  actualizarCancha,
  crearCancha,
  listarTodasLasCanchas,
} from '@/modules/canchas/repositorio'

const NOMBRE_VACIO = ''

/**
 * Alta y edicion de canchas. Solo llega aca quien ya es dueno del predio: lo
 * guarantee el panel (`rol: 'dueno_predio'`) y de vuelta `firestore.rules` con
 * `esDuenoDe(predioId)`. No hay borrar: la baja es `activa: false`.
 */
export function GestorCanchas({
  predioId,
  onCambio,
}: {
  predioId: string
  onCambio: () => void | Promise<void>
}) {
  const [canchas, setCanchas] = useState<Cancha[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      setCanchas(await listarTodasLasCanchas(predioId))
      setError(null)
    } catch {
      setError('No pudimos cargar las canchas.')
    } finally {
      setCargando(false)
    }
  }, [predioId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const crear = async (alta: {
    nombre: string
    tipo: TipoCancha
    techada: boolean
    precioHora: number
  }) => {
    setGuardando(true)
    setError(null)
    try {
      await crearCancha(predioId, alta)
      await cargar()
      await onCambio()
    } catch {
      setError('No pudimos crear la cancha.')
    } finally {
      setGuardando(false)
    }
  }

  const editar = async (canchaId: string, cambios: Partial<Cancha>) => {
    setGuardando(true)
    setError(null)
    try {
      await actualizarCancha(predioId, canchaId, cambios)
      await cargar()
      await onCambio()
    } catch {
      setError('No pudimos guardar los cambios.')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="grid h-20 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-occupied">{error}</p>}

      {canchas.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Este predio todavia no tiene canchas. Agrega la primera para poder abrir la grilla.
          </p>
          <FormularioCancha
            onCancelar={() => undefined}
            onGuardar={async (alta) => {
              await crear(alta)
            }}
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {canchas.map((cancha) => (
            <li key={cancha.id}>
              {editando === cancha.id ? (
                <FormularioCancha
                  initial={cancha}
                  onCancelar={() => setEditando(null)}
                  onGuardar={async (cambios) => {
                    await editar(cancha.id, cambios)
                    setEditando(null)
                  }}
                />
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200/90 px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {etiquetaCancha(cancha)}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {formatearMoneda(cancha.precioHora)} por turno
                      {!cancha.activa && ' · desactivada'}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label={`Editar ${cancha.nombre}`}
                      className="btn-ghost h-9 w-9 px-0 cursor-pointer"
                      onClick={() => setEditando(cancha.id)}
                    >
                      <Pencil className="h-4 w-4 text-slate-600" />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost h-9 px-3 text-xs font-bold cursor-pointer"
                      onClick={() => void editar(cancha.id, { activa: !cancha.activa })}
                    >
                      {cancha.activa ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canchas.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-bold text-emerald-700 hover:text-emerald-800 transition py-1">
            <Plus className="mr-1.5 inline h-4 w-4" />
            Agregar cancha
          </summary>
          <div className="mt-3">
            <FormularioCancha
              onCancelar={() => undefined}
              onGuardar={async (alta) => {
                await crear(alta)
              }}
            />
          </div>
        </details>
      )}

      {canchas.length > 0 && (
        <p className="text-xs text-slate-500 font-medium">
          Desactivar una cancha no borra nada: sus turnos y comprobantes quedan en el
          historial. Volvela a activar si vuelve a estar disponible.
        </p>
      )}

      {guardando && (
        <p className="flex items-center gap-2 text-sm text-slate-600 font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> Guardando...
        </p>
      )}
    </div>
  )
}

function FormularioCancha({
  initial,
  onGuardar,
  onCancelar,
}: {
  initial?: Cancha
  onGuardar: (cambios: {
    nombre: string
    tipo: TipoCancha
    techada: boolean
    precioHora: number
  }) => Promise<void>
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? NOMBRE_VACIO)
  const [tipo, setTipo] = useState<TipoCancha>(initial?.tipo ?? 'F5')
  const [techada, setTechada] = useState(initial?.techada ?? false)
  const [precio, setPrecio] = useState(String(initial?.precioHora ?? ''))
  const [tocado, setTocado] = useState(false)

  const nombreOk = nombre.trim().length >= 3
  const precioNum = Number(precio)
  const precioOk = Number.isFinite(precioNum) && precioNum > 0
  const completo = nombreOk && precioOk

  return (
    <form
      className="space-y-3 rounded-xl bg-slate-50 border border-slate-200 p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setTocado(true)
        if (!completo) return
        await onGuardar({
          nombre: nombre.trim(),
          tipo,
          techada,
          precioHora: Math.round(precioNum),
        })
        if (!initial) {
          setNombre(NOMBRE_VACIO)
          setPrecio('')
          setTocado(false)
        }
      }}
    >
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor="cancha-nombre">
          Nombre de la cancha
        </label>
        <input
          id="cancha-nombre"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
          placeholder="Cancha 1 - Sintético"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        {tocado && !nombreOk && (
          <p className="mt-1 text-xs text-rose-600 font-semibold">Ponele un nombre de al menos 3 letras.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[120px]">
          <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor="cancha-tipo">
            Tipo
          </label>
          <select
            id="cancha-tipo"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoCancha)}
          >
            {TIPOS_CANCHA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="w-36">
          <label className="mb-1 block text-xs font-bold text-slate-700" htmlFor="cancha-precio">
            Precio por turno ($)
          </label>
          <input
            id="cancha-precio"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-bold placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
            type="number"
            min={0}
            step={500}
            inputMode="numeric"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
        </div>
      </div>
      {tocado && !precioOk && (
        <p className="text-xs text-rose-600 font-semibold">El precio tiene que ser mayor a cero.</p>
      )}

      <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={techada}
          onChange={(e) => setTechada(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 cursor-pointer"
        />
        Techada
      </label>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1 py-2.5 cursor-pointer" disabled={tocado && !completo}>
          {initial ? 'Guardar cambios' : 'Agregar cancha'}
        </button>
        {initial && (
          <button type="button" className="btn-ghost px-3 py-2.5 cursor-pointer" onClick={onCancelar} aria-label="Cancelar">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  )
}
