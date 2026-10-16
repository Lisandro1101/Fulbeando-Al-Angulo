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

type Borrador = Pick<Predio, 'nombre' | 'direccion' | 'barrio' | 'ciudad' | 'telefono'> & {
  tipoSena: 'fijo' | 'porcentaje'
  montoSena: string
  porcentajeSena: string
  alias: string
  titular: string
  cbu: string
}

const desdePredio = (p: Predio): Borrador => ({
  nombre: p.nombre,
  direccion: p.direccion,
  barrio: p.barrio,
  ciudad: p.ciudad,
  telefono: p.telefono,
  tipoSena: p.cobro?.tipoSena ?? 'fijo',
  montoSena: String(p.cobro?.montoSena ?? 4000),
  porcentajeSena: String(p.cobro?.porcentajeSena ?? 50),
  alias: p.cobro?.alias ?? '',
  titular: p.cobro?.titular ?? '',
  cbu: p.cobro?.cbu ?? '',
})

/**
 * Edicion del predio propio: lo que el jugador necesita para LLEGAR hasta la
 * cancha (direccion exacta + punto en el mapa), el contacto y los datos de cobro/seña.
 */
export function EditorPredioCard({ duenoUid }: { duenoUid: string }) {
  const [predios, setPredios] = useState<Predio[] | null>(null)
  const [indice, setIndice] = useState(0)
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)

  const predio = predios?.[indice] ?? null
  const { location, requestLocation } = useGeolocation(punto ?? undefined)

  const cargar = async () => {
    setErrorCarga(null)
    try {
      const lista = await listarPrediosDelDueno(duenoUid)
      setPredios(lista)
      setIndice(0)
    } catch {
      setPredios(null)
      setErrorCarga('No pudimos cargar tu predio. Revisá tu conexión e intentá de nuevo.')
    }
  }

  useEffect(() => {
    void cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duenoUid])

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
        cobro: {
          tipoSena: borrador.tipoSena,
          montoSena: Number(borrador.montoSena) > 0 ? Number(borrador.montoSena) : 4000,
          porcentajeSena: Number(borrador.porcentajeSena) > 0 ? Math.min(100, Number(borrador.porcentajeSena)) : 50,
          alias: borrador.alias.trim(),
          titular: borrador.titular.trim(),
          cbu: borrador.cbu.trim() || null,
        },
      })
      await cargar()
      setGuardado(true)
    } catch {
      setError('No pudimos guardar los datos del predio.')
    } finally {
      setGuardando(false)
    }
  }

  if (errorCarga) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-occupied">{errorCarga}</p>
        <button type="button" className="btn-ghost" onClick={() => void cargar()}>
          Reintentar
        </button>
      </div>
    )
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

      {/* SECCIÓN DATOS DE COBRO Y SEÑA */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3 shadow-sm">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
          Cobro de señas y datos bancarios
        </h3>
        <p className="text-xs text-slate-500 font-medium">
          Los jugadores transferirán esta seña para congelar su reserva de turno.
        </p>

        {/* Selector de Modalidad */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wide">
            Modalidad de la seña
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cambiar('tipoSena', 'fijo')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                borrador.tipoSena === 'fijo'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                  : 'border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-400'
              }`}
            >
              💵 Monto Fijo ($)
            </button>
            <button
              type="button"
              onClick={() => cambiar('tipoSena', 'porcentaje')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                borrador.tipoSena === 'porcentaje'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                  : 'border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-400'
              }`}
            >
              📊 Porcentaje (%)
            </button>
          </div>
        </div>

        {borrador.tipoSena === 'fijo' ? (
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600" htmlFor="predio-sena">
              Monto fijo de la seña por turno ($)
            </label>
            <input
              id="predio-sena"
              className="field font-bold text-emerald-700"
              type="number"
              min="0"
              step="500"
              placeholder="Ej: 4000"
              value={borrador.montoSena}
              onChange={(e) => cambiar('montoSena', e.target.value)}
            />
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600" htmlFor="predio-porcentaje">
              Porcentaje del valor de la cancha (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="predio-porcentaje"
                className="field font-bold text-emerald-700 w-28 text-center"
                type="number"
                min="5"
                max="100"
                step="5"
                placeholder="Ej: 50"
                value={borrador.porcentajeSena}
                onChange={(e) => cambiar('porcentajeSena', e.target.value)}
              />
              <div className="flex gap-1.5 flex-1">
                {[30, 50, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => cambiar('porcentajeSena', String(pct))}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                      Number(borrador.porcentajeSena) === pct
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                        : 'border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-400'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Ej: Para una cancha de $10.000 con {borrador.porcentajeSena || 50}%, la seña será de ${((10000 * (Number(borrador.porcentajeSena) || 50)) / 100).toLocaleString('es-AR')}.
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600" htmlFor="predio-alias">
              Alias de transferencia
            </label>
            <input
              id="predio-alias"
              className="field font-mono"
              type="text"
              placeholder="Ej: complejo.futbol.mp"
              value={borrador.alias}
              onChange={(e) => cambiar('alias', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600" htmlFor="predio-titular">
              Titular de la cuenta
            </label>
            <input
              id="predio-titular"
              className="field"
              type="text"
              placeholder="Ej: Juan Pérez"
              value={borrador.titular}
              onChange={(e) => cambiar('titular', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600" htmlFor="predio-cbu">
            CBU / CVU (opcional)
          </label>
          <input
            id="predio-cbu"
            className="field font-mono text-xs"
            type="text"
            placeholder="22 dígitos"
            value={borrador.cbu}
            onChange={(e) => cambiar('cbu', e.target.value)}
          />
        </div>
      </div>

      <div>
        <span className="mb-1 block text-xs font-bold text-slate-600">Ubicacion exacta en el mapa</span>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
                {location.loading ? 'Ubicando...' : 'Punto cargado'}
              </p>
              <p className="truncate font-mono text-xs text-slate-500">
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
          <p className="mt-2 text-xs text-slate-500">
            Se muestra en el radar y en la ficha del predio. Si estas en la cancha, con tocar
            "Desde mi GPS" queda exacto.
          </p>
          {location.error && !location.isFallback && (
            <p className="mt-1 text-xs text-rose-600">{location.error}</p>
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
