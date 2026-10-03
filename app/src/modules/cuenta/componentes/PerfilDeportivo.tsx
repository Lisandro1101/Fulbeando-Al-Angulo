import { useState } from 'react'
import { Crosshair, Loader2, MapPin } from 'lucide-react'
import type { NivelAutopercibido, PerfilDeportivo, PiernaHabil, Posicion, Usuario } from '@/domain'
import { PERFIL_DEPORTIVO_VACIO } from '@/domain'
import { actualizarPerfilDeportivo, guardarGeo } from '@/modules/usuarios/repositorio'

const POSICIONES: readonly Posicion[] = ['arquero', 'defensor', 'medio', 'delantero']
const NIEVELE: readonly NivelAutopercibido[] = [1, 2, 3, 4, 5]

const ETIQUETA_POSICION: Record<Posicion, string> = {
  arquero: 'Arquero',
  defensor: 'Defensor',
  medio: 'Medio',
  delantero: 'Delantero',
}

/**
 * Perfil deportivo + "Disponible para jugar hoy". El switch es lo que habilita
 * al usuario en el radar: `esCandidatoParaRadar` lo exige en el dominio.
 */
export function PerfilDeportivoCard({
  usuario,
  onCambio,
}: {
  usuario: Usuario
  onCambio: (usuario: Usuario) => void
}) {
  const [perfil, setPerfil] = useState<PerfilDeportivo>(
    usuario.perfilDeportivo ?? PERFIL_DEPORTIVO_VACIO,
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const actualizar = async (cambios: Partial<PerfilDeportivo>) => {
    const anterior = perfil
    const siguiente = { ...perfil, ...cambios }
    setPerfil(siguiente)
    setGuardando(true)
    setError(null)
    try {
      await actualizarPerfilDeportivo(usuario.uid, siguiente)
      onCambio({ ...usuario, perfilDeportivo: siguiente })
    } catch {
      setPerfil(anterior)
      setError('No pudimos guardar tu perfil.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-ink-muted" htmlFor="perfil-posicion">
            Posicion preferida
          </label>
          <select
            id="perfil-posicion"
            className="field"
            value={perfil.posicion ?? ''}
            onChange={(e) =>
              void actualizar({
                posicion: e.target.value === '' ? null : (e.target.value as Posicion),
              })
            }
          >
            <option value="">Sin definir</option>
            {POSICIONES.map((p) => (
              <option key={p} value={p}>
                {ETIQUETA_POSICION[p]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-ink-muted" htmlFor="perfil-pierna">
            Pierna habil
          </label>
          <select
            id="perfil-pierna"
            className="field"
            value={perfil.piernaHabil ?? ''}
            onChange={(e) =>
              void actualizar({
                piernaHabil: e.target.value === '' ? null : (e.target.value as PiernaHabil),
              })
            }
          >
            <option value="">Sin definir</option>
            <option value="diestro">Diestro</option>
            <option value="zurdo">Zurdo</option>
          </select>
        </div>
      </div>

      <div>
        <span className="mb-1 block text-xs text-ink-muted">Nivel autopercibido</span>
        <div className="flex gap-1.5">
          {NIEVELE.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={perfil.nivel === n}
              className={`h-10 flex-1 rounded-xl border text-sm font-semibold ${
                perfil.nivel === n
                  ? 'border-pitch bg-pitch-faint/40 text-pitch'
                  : 'border-ink-faint/30 text-ink-muted'
              }`}
              onClick={() => void actualizar({ nivel: perfil.nivel === n ? null : n })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <Interruptor
        id="perfil-disponible"
        activo={perfil.disponibleHoy}
        titulo="Disponible para jugar hoy"
        descripcion="Te muestra el radar de suplentes que te queda cerca."
        onToggle={(v) => void actualizar({ disponibleHoy: v })}
      />

      <Interruptor
        id="perfil-notificaciones"
        activo={perfil.notificacionesRadar}
        titulo="Notificaciones del radar"
        descripcion="Avisos de turnos que necesitan jugador."
        onToggle={(v) => void actualizar({ notificacionesRadar: v })}
      />

      {guardando && (
        <p className="flex items-center gap-2 text-xs text-ink-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...
        </p>
      )}
      {error && <p className="text-sm text-occupied">{error}</p>}
    </div>
  )
}

/** Ubicacion aproximada: es lo que permite consultar el radar por proximidad. */
export function UbicacionCard({
  usuario,
  onCambio,
}: {
  usuario: Usuario
  onCambio: (usuario: Usuario) => void
}) {
  const [pidiendo, setPidiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ubicar = () => {
    if (!('geolocation' in navigator)) {
      setError('Este dispositivo no reporta ubicacion.')
      return
    }
    setPidiendo(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const geo = await guardarGeo(usuario.uid, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
          onCambio({ ...usuario, geo })
        } catch {
          setError('No pudimos guardar tu ubicacion.')
        } finally {
          setPidiendo(false)
        }
      },
      () => {
        setError('No pudimos obtener la ubicacion. Revisa el permiso del navegador.')
        setPidiendo(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }

  return (
    <div className="space-y-3">
      {usuario.geo === null ? (
        <>
          <p className="text-sm text-ink-muted">
            Sin ubicacion no podes ver el radar de suplentes ni que te encuentren.
          </p>
          <button type="button" className="btn-ghost w-full" onClick={ubicar} disabled={pidiendo}>
            {pidiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            Usar mi ubicacion
          </button>
        </>
      ) : (
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <MapPin className="h-4 w-4 text-pitch" />
          Ubicacion guardada ({usuario.geo.lat.toFixed(3)}, {usuario.geo.lng.toFixed(3)}). Se
          guarda una zona aproximada, no tu posicion exacta.
        </p>
      )}
      {error && <p className="text-sm text-urgent">{error}</p>}
    </div>
  )
}

function Interruptor({
  id,
  activo,
  titulo,
  descripcion,
  onToggle,
}: {
  id: string
  activo: boolean
  titulo: string
  descripcion: string
  onToggle: (valor: boolean) => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-3"
    >
      <span>
        <span className="block text-sm font-medium text-ink">{titulo}</span>
        <span className="block text-xs text-ink-muted">{descripcion}</span>
      </span>
      <input
        id={id}
        type="checkbox"
        checked={activo}
        onChange={(e) => onToggle(e.target.checked)}
        className="h-5 w-5 shrink-0 accent-pitch"
      />
    </label>
  )
}
