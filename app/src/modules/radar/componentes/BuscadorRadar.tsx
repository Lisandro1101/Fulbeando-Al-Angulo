import { useMemo, useState, useEffect, useRef } from 'react'
import {
  Search,
  X,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import type { RadarEntity, RadarEntityType, CanchaEntity, EquipoEntity, DesafioEntity, JugadorEntity } from '../pantallas/MapaRadarUnificado'
import { IconoCancha, IconoEquipo, IconoDesafio, IconoJugador, obtenerCantidadFaltantes } from '../pantallas/MapaRadarUnificado'
import { buscarJugadores } from '@/modules/teams/teamService'

// Función auxiliar para normalizar texto (sin tildes, minúsculas)
const normalizar = (txt: string | null | undefined = '') =>
  (txt ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

interface BuscadorRadarProps {
  abierto: boolean
  onCerrar: () => void
  entidades: RadarEntity[]
  onSeleccionar: (entidad: RadarEntity) => void
}

export function BuscadorRadar({
  abierto,
  onCerrar,
  entidades,
  onSeleccionar,
}: BuscadorRadarProps) {
  const [query, setQuery] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<RadarEntityType | 'todos'>('todos')
  const [jugadoresRemotos, setJugadoresRemotos] = useState<JugadorEntity[]>([])
  const [buscandoRemoto, setBuscandoRemoto] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (abierto) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setFiltroTipo('todos')
      setJugadoresRemotos([])
      setBuscandoRemoto(false)
    }
  }, [abierto])

  // Búsqueda remota en la base de datos si el usuario busca por @ o nombre de jugador
  useEffect(() => {
    const termino = query.trim().replace(/^@+/, '')
    if (termino.length < 2 || (filtroTipo !== 'todos' && filtroTipo !== 'jugador')) {
      setJugadoresRemotos([])
      setBuscandoRemoto(false)
      return
    }

    let activo = true
    setBuscandoRemoto(true)

    const timer = setTimeout(async () => {
      try {
        const res = await buscarJugadores(termino, 10)
        if (!activo) return

        // Extraer IDs que ya están en las entidades locales del radar para no duplicar
        const uidsLocales = new Set(entidades.filter((e) => e.type === 'jugador').map((e) => e.id))
        const nuevos: JugadorEntity[] = res
          .filter((r) => !uidsLocales.has(r.uid))
          .map((r) => ({
            id: r.uid,
            type: 'jugador' as const,
            lat: r.geo?.lat ?? 0,
            lng: r.geo?.lng ?? 0,
            distanciaKm: 0,
            uid: r.uid,
            apodo: r.name,
            username: r.username,
            posicion: r.posicion || 'Cualquiera',
            media: r.media || 75,
            fairPlay: 100,
            fotoUrl: r.avatarUrl,
          }))

        setJugadoresRemotos(nuevos)
      } catch (err) {
        console.warn('Error en búsqueda remota de jugadores:', err)
      } finally {
        if (activo) setBuscandoRemoto(false)
      }
    }, 200)

    return () => {
      activo = false
      clearTimeout(timer)
    }
  }, [query, filtroTipo, entidades])

  // Lista combinada de entidades locales y jugadores encontrados
  const listaTotal = useMemo(() => {
    if (jugadoresRemotos.length === 0) return entidades
    return [...entidades, ...jugadoresRemotos]
  }, [entidades, jugadoresRemotos])

  // Filtrado de resultados
  const resultados = useMemo(() => {
    const qRaw = query.trim()
    const q = normalizar(qRaw)
    const qSinArroba = normalizar(qRaw.replace(/^@+/, ''))

    return listaTotal
      .filter((e) => {
        if (filtroTipo !== 'todos' && e.type !== filtroTipo) return false
        if (!q && !qSinArroba) return true

        if (e.type === 'cancha') {
          const c = e as CanchaEntity
          return (
            normalizar(c.nombre).includes(qSinArroba) ||
            normalizar(c.barrio).includes(qSinArroba) ||
            normalizar(c.direccion).includes(qSinArroba) ||
            normalizar(c.ciudad).includes(qSinArroba)
          )
        }

        if (e.type === 'equipo') {
          const eq = e as EquipoEntity
          return (
            normalizar(eq.nombre).includes(qSinArroba) ||
            normalizar(eq.modalidad).includes(qSinArroba)
          )
        }

        if (e.type === 'desafio') {
          const d = e as DesafioEntity
          return (
            normalizar(d.equipo).includes(qSinArroba) ||
            normalizar(d.posicionBuscada).includes(qSinArroba) ||
            normalizar(d.descripcion).includes(qSinArroba) ||
            normalizar(d.modalidad).includes(qSinArroba)
          )
        }

        if (e.type === 'jugador') {
          const j = e as JugadorEntity
          const apodoNorm = normalizar(j.apodo)
          const userNorm = normalizar(j.username)
          const posNorm = normalizar(j.posicion)
          return (
            apodoNorm.includes(qSinArroba) ||
            apodoNorm.includes(q) ||
            (userNorm && (userNorm.includes(qSinArroba) || userNorm.includes(q))) ||
            posNorm.includes(qSinArroba)
          )
        }

        return false
      })
      .sort((a, b) => {
        // Los pines del mapa con distancia real van primero
        if (a.distanciaKm > 0 && b.distanciaKm > 0) return a.distanciaKm - b.distanciaKm
        if (a.distanciaKm > 0) return -1
        if (b.distanciaKm > 0) return 1
        return 0
      })
      .slice(0, 30)
  }, [listaTotal, query, filtroTipo])

  if (!abierto) return null

  return (
    <div className="absolute inset-0 z-40 bg-canvas/85 backdrop-blur-md flex flex-col p-3 sm:p-5 pt-safe animate-in fade-in duration-200">
      {/* BARRA DE BÚSQUEDA FLOTANTE */}
      <div className="w-full max-w-xl mx-auto space-y-3">
        <div className="relative flex items-center bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl p-1.5 focus-within:border-pitch transition-all">
          <div className="p-2.5 text-zinc-400">
            {buscandoRemoto ? (
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-pitch" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por @usuario, nombre, predio o equipo..."
            aria-label="Buscar en radar"
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 font-medium outline-none px-2 py-1"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-2 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              title="Borrar texto"
              aria-label="Borrar texto"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar búsqueda"
            className="ml-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>

        {/* FILTROS RÁPIDOS POR CATEGORÍA */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1 text-xs">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'cancha', label: 'Canchas / Predios' },
            { id: 'equipo', label: 'Equipos' },
            { id: 'desafio', label: 'Desafíos' },
            { id: 'jugador', label: 'Jugadores' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltroTipo(id as RadarEntityType | 'todos')}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer ${
                filtroTipo === id
                  ? 'bg-emerald-500 text-zinc-950 font-black shadow-sm'
                  : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* LISTA DE RESULTADOS */}
        <div className="max-h-[68vh] overflow-y-auto space-y-2 pr-1 rounded-2xl">
          {resultados.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 p-6">
              <Search className="w-8 h-8 mx-auto mb-2 text-zinc-600 opacity-50" />
              <p className="text-sm font-bold text-zinc-300">No encontramos resultados</p>
              <p className="text-xs text-zinc-500 mt-1">
                Probá buscando por @usuario, nombre de jugador, complejo o equipo.
              </p>
            </div>
          ) : (
            resultados.map((item) => {
              const esCancha = item.type === 'cancha'
              const esEquipo = item.type === 'equipo'
              const esDesafio = item.type === 'desafio'
              const esJugador = item.type === 'jugador'

              let titulo = ''
              let subtitulo = ''
              let badgeBg = ''
              let badgeColor = ''
              let badgeLabel = ''

              if (esCancha) {
                const c = item as CanchaEntity
                titulo = c.nombre
                subtitulo = [c.barrio, c.direccion, c.ciudad].filter(Boolean).join(' · ')
                badgeBg = 'bg-emerald-500/15'
                badgeColor = 'text-emerald-400'
                badgeLabel = 'Cancha'
              } else if (esEquipo) {
                const eq = item as EquipoEntity
                titulo = eq.nombre
                subtitulo = `Equipo ${eq.modalidad} · ${eq.cantidadJugadores} jugadores`
                badgeBg = 'bg-sky-500/15'
                badgeColor = 'text-sky-400'
                badgeLabel = 'Equipo'
              } else if (esDesafio) {
                const d = item as DesafioEntity
                const cant = obtenerCantidadFaltantes(d)
                titulo = d.equipo || 'Desafío Abierto'
                subtitulo = d.tipoDesafio === 'busqueda_jugador'
                  ? `Faltan ${cant} ${cant === 1 ? 'jugador' : 'jugadores'} · ${d.modalidad}${d.posicionBuscada ? ` (${d.posicionBuscada})` : ''}`
                  : (d.posicionBuscada
                    ? `Busca ${d.posicionBuscada} (${d.modalidad})`
                    : `Partido desafío ${d.modalidad}`)
                badgeBg = 'bg-amber-500/15'
                badgeColor = 'text-amber-400'
                badgeLabel = d.tipoDesafio === 'busqueda_jugador'
                  ? (cant > 1 ? `Faltan ${cant}` : 'Falta 1')
                  : 'Desafío'
              } else if (esJugador) {
                const j = item as JugadorEntity
                titulo = j.apodo || 'Jugador'
                const userTag = j.username ? `@${j.username}` : ''
                subtitulo = [userTag, j.posicion || 'Jugador', `Media ${j.media ?? 75}`].filter(Boolean).join(' · ')
                badgeBg = 'bg-blue-500/15'
                badgeColor = 'text-blue-400'
                badgeLabel = 'Jugador'
              }

              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => onSeleccionar(item)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800/80 hover:border-zinc-700 transition text-left group cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl ${badgeBg} ${badgeColor} shrink-0`}>
                      {esCancha && <IconoCancha className="w-5 h-5" />}
                      {esEquipo && <IconoEquipo className="w-5 h-5" />}
                      {esDesafio && <IconoDesafio className="w-5 h-5" />}
                      {esJugador && <IconoJugador className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-100 truncate group-hover:text-emerald-400 transition-colors">
                          {titulo}
                        </span>
                        {esJugador && (item as JugadorEntity).username && (
                          <span className="text-xs font-semibold text-sky-400 shrink-0">
                            @{(item as JugadorEntity).username}
                          </span>
                        )}
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${badgeBg} ${badgeColor} uppercase tracking-wider`}>
                          {badgeLabel}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium">
                        {subtitulo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {typeof item.distanciaKm === 'number' && item.distanciaKm > 0 ? (
                      <span className="text-xs font-bold text-zinc-400 font-mono">
                        {item.distanciaKm < 1
                          ? `${Math.round(item.distanciaKm * 1000)} m`
                          : `${item.distanciaKm.toFixed(1)} km`}
                      </span>
                    ) : esJugador ? (
                      <span className="text-[10px] font-bold text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        Jugador
                      </span>
                    ) : null}
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
