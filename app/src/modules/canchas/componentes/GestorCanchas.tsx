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
        <p className="text-sm text-ink-muted">
          Este predio todavia no tiene canchas. Agrega la primera para poder abrir la grilla.
        </p>
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
                <div className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {etiquetaCancha(cancha)}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {formatearMoneda(cancha.precioHora)} por turno
                      {!cancha.activa && ' · desactivada'}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label={`Editar ${cancha.nombre}`}
                      className="btn-ghost h-9 w-9 px-0"
                      onClick={() => setEditando(cancha.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost h-9 px-3 text-xs"
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
        <details>
          <summary className="cursor-pointer text-sm text-ink-muted">
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
        <p className="text-xs text-ink-muted">
          Desactivar una cancha no borra nada: sus turnos y comprobantes quedan en el
          historial. Volvela a activar si vuelve a estar disponible.
        </p>
      )}

      {guardando && (
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
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
      className="space-y-3 rounded-xl bg-canvas p-3"
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
        <label className="mb-1 block text-xs text-ink-muted" htmlFor="cancha-nombre">
          Nombre
        </label>
        <input
          id="cancha-nombre"
          className="field"
          placeholder="Cancha 1 - Sintetico"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        {tocado && !nombreOk && (
          <p className="mt-1 text-xs text-urgent">Ponele un nombre de al menos 3 letras.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div>
          <label className="mb-1 block text-xs text-ink-muted" htmlFor="cancha-tipo">
            Tipo
          </label>
          <select
            id="cancha-tipo"
            className="field"
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
        <div>
          <label className="mb-1 block text-xs text-ink-muted" htmlFor="cancha-precio">
            Precio por turno
          </label>
          <input
            id="cancha-precio"
            className="field w-32"
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
        <p className="text-xs text-urgent">El precio tiene que ser mayor a cero.</p>
      )}

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={techada}
          onChange={(e) => setTechada(e.target.checked)}
          className="h-4 w-4 accent-pitch"
        />
        Techada
      </label>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1" disabled={tocado && !completo}>
          {initial ? 'Guardar cambios' : 'Agregar cancha'}
        </button>
        {initial && (
          <button type="button" className="btn-ghost" onClick={onCancelar} aria-label="Cancelar">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  )
}
