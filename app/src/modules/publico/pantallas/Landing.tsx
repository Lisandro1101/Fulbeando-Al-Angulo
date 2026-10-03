import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, MapPin, Navigation, Search, X, ShieldCheck, Zap } from 'lucide-react'
import type { Predio } from '@/domain'
import { canchasDe } from '@/domain'
import { listarPrediosPublicos, normalizarBarrio } from '@/modules/predios/repositorio'
import { formatearMoneda } from '@/core/tiempo'
import { NavegacionHeader } from '@/modules/ui/NavegacionHeader'

const MapaPredios = lazy(() =>
  import('@/modules/predios/mapa/MapaPredios').then((m) => ({ default: m.MapaPredios })),
)

const barrioDeUrl = (): string => new URLSearchParams(window.location.search).get('barrio') ?? ''

type FiltroTipo = 'todos' | 'F5' | 'F7' | 'F8' | 'F11' | 'techada'

export default function Landing() {
  const [consulta, setConsulta] = useState(barrioDeUrl)
  const [busqueda, setBusqueda] = useState(consulta.trim())
  const [predios, setPredios] = useState<Predio[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [ubicacionUsuario, setUbicacionUsuario] = useState<{ lat: number; lng: number } | null>(null)
  const [obteniendoGeo, setObteniendoGeo] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(consulta.trim()), 350)
    return () => clearTimeout(t)
  }, [consulta])

  useEffect(() => {
    let vigente = true
    setCargando(true)
    listarPrediosPublicos(busqueda)
      .then((lista) => {
        if (!vigente) return
        setPredios(lista)
        setError(null)
      })
      .catch((err) => {
        console.error('Error al listar predios:', err)
        if (!vigente) return
        setError(`No pudimos cargar las canchas (${err?.message || String(err)})`)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [busqueda])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (busqueda.length > 0) url.searchParams.set('barrio', busqueda)
    else url.searchParams.delete('barrio')
    window.history.replaceState(null, '', url)
  }, [busqueda])

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) return
    setObteniendoGeo(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacionUsuario({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setObteniendoGeo(false)
      },
      () => setObteniendoGeo(false),
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }

  const limpiar = useCallback(() => {
    setConsulta('')
    setBusqueda('')
  }, [])

  const prediosFiltrados = useMemo(() => {
    if (filtroTipo === 'todos') return predios
    if (filtroTipo === 'techada') {
      return predios.filter((p) => canchasDe(p).some((c) => c.techada))
    }
    return predios.filter((p) => canchasDe(p).some((c) => c.tipo === filtroTipo))
  }, [predios, filtroTipo])

  const barriosSugeridos = useMemo(() => {
    const unicos = new Map<string, string>()
    for (const predio of predios) unicos.set(predio.barrioNormalizado, predio.barrio)
    return [...unicos.values()]
  }, [predios])

  return (
    <div className="min-h-full bg-canvas pb-safe">
      <NavegacionHeader />

      <main className="mx-auto w-full space-y-5 px-4 py-6">
        {/* Banner de Presentación */}
        <section className="rounded-3xl bg-gradient-to-r from-canvas-raised via-slate-800 to-canvas-raised p-6 border border-ink-faint/20 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-pitch">
                Reserva Online & Radar Falta 1
              </p>
              <h1 className="mt-1 text-2xl font-black text-ink sm:text-3xl">
                Encontrá tu cancha y jugá hoy
              </h1>
              <p className="mt-1.5 text-sm text-ink-muted">
                Mapa interactivo en vivo con franjas horarias y radar de suplentes por cercanía.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={obtenerUbicacion}
                disabled={obteniendoGeo}
                className="btn-ghost text-xs"
              >
                {obteniendoGeo ? (
                  <Loader2 className="h-4 w-4 animate-spin text-pitch" />
                ) : (
                  <Navigation className="h-4 w-4 text-pitch" />
                )}
                {ubicacionUsuario ? 'Ubicación activa' : 'Usar mi ubicación'}
              </button>
            </div>
          </div>
        </section>

        {/* Buscador de Barrio/Zona */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
            <input
              className="field pl-11 pr-10"
              type="search"
              inputMode="search"
              autoComplete="off"
              placeholder="Buscar por barrio o zona (ej: Palermo, Boedo...)"
              aria-label="Buscar canchas por barrio"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
            />
            {consulta.length > 0 && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                onClick={limpiar}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros de Cancha */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-muted">Filtrar:</span>
          {(['todos', 'F5', 'F7', 'F8', 'F11', 'techada'] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setFiltroTipo(tipo)}
              className={`badge transition-colors ${
                filtroTipo === tipo
                  ? 'bg-pitch text-canvas font-bold'
                  : 'bg-canvas-raised text-ink-muted hover:bg-slate-700'
              }`}
            >
              {tipo === 'todos' ? 'Todas' : tipo === 'techada' ? '🌧️ Techadas' : tipo}
            </button>
          ))}
        </div>

        {/* Mapa Interactivo */}
        <section className="surface overflow-hidden p-0 border border-ink-faint/20 shadow-2xl">
          {error ? (
            <p className="p-4 text-sm text-occupied">{error}</p>
          ) : (
            <Suspense
              fallback={
                <div className="grid h-[340px] w-full place-items-center text-sm text-ink-muted sm:h-[440px]">
                  Cargando mapa interactivo...
                </div>
              }
            >
              <MapaPredios
                predios={prediosFiltrados}
                seleccionadoId={seleccionadoId}
                alSeleccionar={setSeleccionadoId}
                latitudUsuario={ubicacionUsuario}
              />
            </Suspense>
          )}
          {cargando && (
            <p className="flex items-center gap-2 border-t border-ink-faint/20 px-4 py-2 text-xs text-ink-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando canchas...
            </p>
          )}
        </section>

        {/* Sugerencias de Barrios */}
        {barriosSugeridos.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-ink-muted">Barrios:</span>
            {barriosSugeridos.map((barrio) => (
              <button
                key={barrio}
                type="button"
                onClick={() => setConsulta(barrio)}
                className={`badge transition-colors ${
                  normalizarBarrio(busqueda) === normalizarBarrio(barrio)
                    ? 'bg-pitch-faint text-pitch font-bold'
                    : 'bg-ink-faint/20 text-ink-muted hover:bg-ink-faint/30'
                }`}
              >
                {barrio}
              </button>
            ))}
          </div>
        )}

        {/* Lista de Complejos */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted">
            {busqueda.length > 0 ? `Canchas en ${busqueda}` : 'Complejos Deportivos Adheridos'}
          </h2>

          {prediosFiltrados.length === 0 && !cargando && (
            <div className="surface p-6 text-center">
              <p className="text-sm font-semibold text-ink-muted">
                No encontramos canchas con los filtros aplicados.
              </p>
              <button type="button" onClick={limpiar} className="btn-ghost mt-3 text-xs">
                Limpiar filtros
              </button>
            </div>
          )}

          {prediosFiltrados.map((predio) => (
            <article
              key={predio.id}
              className={`surface transition-all ${
                seleccionadoId === predio.id ? 'ring-2 ring-pitch shadow-pitch/10' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-ink">{predio.nombre}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                    <MapPin className="h-4 w-4 shrink-0 text-pitch" />
                    {predio.direccion} · {predio.barrio}
                  </p>
                </div>
                {predio.verificado && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-pitch-faint px-3 py-1 text-xs font-bold text-pitch">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verificado
                  </span>
                )}
              </div>

              <ul className="mt-4 flex flex-wrap gap-2">
                {canchasDe(predio).map((cancha) => (
                  <li key={cancha.id} className="badge bg-canvas border border-ink-faint/20 px-3 py-1.5 text-ink-muted">
                    <span className="font-bold text-ink">{cancha.nombre}</span> · {cancha.tipo}
                    {cancha.techada ? ' · 🌧️ Techada' : ''} ·{' '}
                    <span className="text-pitch font-semibold">{formatearMoneda(cancha.precioHora)}/h</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between border-t border-ink-faint/20 pt-4">
                <div>
                  <p className="text-xs text-ink-muted">Seña requerida</p>
                  <p className="text-sm font-bold text-ink">{formatearMoneda(predio.cobro.montoSena)}</p>
                </div>
                <Link
                  to={`/reservar/${predio.id}`}
                  className="btn-primary"
                  onClick={() => setSeleccionadoId(predio.id)}
                >
                  Ver disponibilidad
                </Link>
              </div>
            </article>
          ))}
        </section>

        {/* Acciones Rápidas */}
        <section className="grid gap-4 sm:grid-cols-2">
          <Link to="/dashboard" className="btn-urgent h-auto flex-col items-start gap-1 p-5 shadow-lg shadow-urgent/10">
            <span className="flex items-center gap-2 text-base font-bold">
              <Zap className="h-5 w-5" /> Sumate a un Partido
            </span>
            <span className="text-xs font-normal opacity-90">
              Radar de suplentes buscando gente cerca de vos.
            </span>
          </Link>
          <Link to="/ajustes" className="btn-ghost h-auto flex-col items-start gap-1 p-5">
            <span className="text-base font-bold">¿Tenés un Complejo Deportivo?</span>
            <span className="text-xs font-normal text-ink-muted">
              Publicá tus canchas gratis y gestioná tus turnos en vivo.
            </span>
          </Link>
        </section>
      </main>
    </div>
  )
}