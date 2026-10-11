import { useEffect, useState } from 'react'
import { Crosshair, Loader2, MapPin, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Predio } from '@/domain'
import { appEnv } from '@/core/config'
import { aGeoIndex } from '@/core/geo'
import { useGeolocation } from '@/hooks/useGeolocation'
import {
  actualizarPredio,
  listarPrediosDelDueno,
  normalizarBarrio,
} from '@/modules/predios/repositorio'

type Borrador = Pick<Predio, 'nombre' | 'direccion' | 'barrio' | 'ciudad' | 'telefono'>

const desdePredio = (p: Predio): Borrador => ({
  nombre: p.nombre,
  direccion: p.direccion,
  barrio: p.barrio,
  ciudad: p.ciudad,
  telefono: p.telefono,
})

/**
 * Edicion del predio propio: lo que el jugador necesita para LLEGAR hasta la
 * cancha (direccion exacta + punto en el mapa) y el contacto.
 *
 * Es la unica pantalla que modifica `predio.direccion` y `predio.geo` despues
 * del alta (`Screen8VenueRegistration`): sin esto, una direccion mal cargada
 * no tenia arreglo sin borrar el predio.
 */
export function EditorPredioCard({ duenoUid }: { duenoUid: string }) {
  const [predios, setPredios] = useState<Predio[] | null>(null)
  const [indice, setIndice] = useState(0)
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)

  const predio = predios?.[indice] ?? null
  const { location, requestLocation } = useGeolocation(punto ?? undefined)

  const cargar = async () => {
    try {
      const lista = await listarPrediosDelDueno(duenoUid)
      setPredios(lista)
      setIndice(0)
    } catch {
      setPredios([])
    }
  }

  useEffect(() => {
    void cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duenoUid])

  // Un predio distinto (o el primer cargado) arranca un borrador nuevo.
  // Depende del id y no del objeto: `guardar()` recarga la lista y `predio`
  // pasa a ser otra referencia, lo que re-triggeriaba este effect y borraba
  // el "Datos guardados" apenas aparecia.
  useEffect(() => {
    if (!predio) {
      setBorrador(null)
      setPunto(null)
      return
    }
    setBorrador(desdePredio(predio))
    setPunto({ lat: predio.geo.lat, lng: predio.geo.lng })
    setGuardado(false)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predio?.id])

  // La posicion que devuelve el GPS reemplaza al punto guardado. El fallback
  // (CABA) no se aplica: un dueño sin permiso no deberia mover su predio a
  // otro lado sin darse cuenta.
  useEffect(() => {
    if (location.loading || location.isFallback) return
    if (location.latitude === null || location.longitude === null) return
    setPunto({ lat: location.latitude, lng: location.longitude })
    setGuardado(false)
  }, [location.latitude, location.longitude, location.loading, location.isFallback])

  const cambiar = (campo: keyof Borrador, valor: string) => {
    setGuardado(false)
    setError(null)
    setBorrador((prev) => (prev ? { ...prev, [campo]: valor } : prev))
  }

  const valido =
    borrador !== null &&
    borrador.nombre.trim().length >= 3 &&
    borrador.direccion.trim().length >= 5 &&
    borrador.barrio.trim().length >= 2 &&
    borrador.ciudad.trim().length >= 2

  const guardar = async () => {
    if (!predio || !borrador || !punto || !valido) return
    setGuardando(true)
    setError(null)
    setGuardado(false)
    try {
      await actualizarPredio(predio.id, {
        nombre: borrador.nombre.trim(),
        direccion: borrador.direccion.trim(),
        barrio: borrador.barrio.trim(),
        ciudad: borrador.ciudad.trim(),
        telefono: borrador.telefono.trim(),
        barrioNormalizado: normalizarBarrio(borrador.barrio),
        geo: aGeoIndex(punto, appEnv().radarRadioKm),
      })
      await cargar()
      setGuardado(true)
    } catch {
      setError('No pudimos guardar los datos del predio.')
    } finally {
      setGuardando(false)
    }
  }

  if (predios === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando tu predio...
      </p>
    )
  }

  if (predios.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">
          Todavia no cargaste tu complejo. Dale de alta para figurar en el radar y que los
          jugadores sepan donde queda.
        </p>
        <Link to="/venue-registration" className="btn-primary inline-flex">
          Dar de alta mi predio
        </Link>
      </div>
    )
  }

  if (!borrador || !punto) return null

  return (
    <div className="space-y-4">
      {predios.length > 1 && (
        <div>
          <label className="mb-1 block text-xs text-ink-muted" htmlFor="predio-elegir">
            Predio a editar
          </label>
          <select
            id="predio-elegir"
            className="field"
            value={indice}
            onChange={(e) => setIndice(Number(e.target.value))}
          >
            {predios.map((p, i) => (
              <option key={p.id} value={i}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-ink-muted" htmlFor="predio-nombre">
            Nombre del complejo
          </label>
          <input
            id="predio-nombre"
            className="field"
            type="text"
            value={borrador.nombre}
            onChange={(e) => cambiar('nombre', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-muted" htmlFor="predio-telefono">
            Telefono de contacto
          </label>
          <input
            id="predio-telefono"
            className="field"
            type="tel"
            inputMode="tel"
            value={borrador.telefono}
            onChange={(e) => cambiar('telefono', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-ink-muted" htmlFor="predio-direccion">
          Direccion exacta
        </label>
        <input
          id="predio-direccion"
          className="field"
          type="text"
          placeholder="Calle, numero, referencias"
          value={borrador.direccion}
          onChange={(e) => cambiar('direccion', e.target.value)}
        />
        <p className="mt-1 text-xs text-ink-muted">
          Es la direccion que ven los jugadores para llegar hasta tu cancha.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-ink-muted" htmlFor="predio-barrio">
            Barrio / localidad
          </label>
          <input
            id="predio-barrio"
            className="field"
            type="text"
            value={borrador.barrio}
            onChange={(e) => cambiar('barrio', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-muted" htmlFor="predio-ciudad">
            Ciudad
          </label>
          <input
            id="predio-ciudad"
            className="field"
            type="text"
            value={borrador.ciudad}
            onChange={(e) => cambiar('ciudad', e.target.value)}
          />
        </div>
      </div>

      <div>
        <span className="mb-1 block text-xs text-ink-muted">Ubicacion exacta en el mapa</span>
        <div className="rounded-xl bg-canvas-raised p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <MapPin className="h-4 w-4 shrink-0 text-pitch" />
                {location.loading ? 'Ubicando...' : 'Punto cargado'}
              </p>
              <p className="truncate font-mono text-xs text-ink-muted">
                {punto.lat.toFixed(5)}, {punto.lng.toFixed(5)}
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost shrink-0 py-2 text-xs"
              onClick={requestLocation}
              disabled={location.loading}
            >
              <Crosshair className="h-4 w-4" />
              {location.loading ? '...' : 'Desde mi GPS'}
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Se muestra en el radar y en la ficha del predio. Si estas en la cancha, con tocar
            "Desde mi GPS" queda exacto.
          </p>
          {location.error && !location.isFallback && (
            <p className="mt-1 text-xs text-occupied">{location.error}</p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-occupied">{error}</p>}

      <button
        type="button"
        className="btn-primary w-full"
        onClick={() => void guardar()}
        disabled={guardando || !valido}
      >
        {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Guardar datos del predio
      </button>

      {guardado && <p className="text-sm font-semibold text-pitch">Datos guardados.</p>}
    </div>
  )
}
