import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, MapPin, UserCheck, Sparkles, Image, MessageSquare, Filter } from 'lucide-react'
import { useSesion } from '@/modules/auth/useSesion'
import type { Publicacion } from '@/domain'
import { inferirMunicipio } from '@/core/geo/zonas'
import { alternarSeguir, escucharSiguiendo } from '../follows'
import { escucharFeed, type FiltroFeed } from '../repositorio'
import { Composer } from './Composer'
import { PostCard } from './PostCard'
import { Esqueleto } from '@/modules/ui/overlays'

interface Tab {
  id: FiltroFeed
  etiqueta: string
  icono: typeof Globe
}

const TABS: Tab[] = [
  { id: 'comunidad', etiqueta: 'Comunidad', icono: Globe },
  { id: 'zona', etiqueta: 'Mi zona', icono: MapPin },
  { id: 'siguiendo', etiqueta: 'Siguiendo', icono: UserCheck },
]

type TipoFiltro = 'todos' | 'cartas' | 'fotos' | 'avisos'

const CATEGORIAS_FILTRO: Array<{ id: TipoFiltro; etiqueta: string; icono: typeof MessageSquare }> = [
  { id: 'todos', etiqueta: 'Todo', icono: MessageSquare },
  { id: 'cartas', etiqueta: 'Cartas FUT', icono: Sparkles },
  { id: 'fotos', etiqueta: 'Fotos', icono: Image },
  { id: 'avisos', etiqueta: 'Avisos & Plantel', icono: Filter },
]

interface FeedProps {
  busqueda?: string
}

/**
 * Muro social de la comunidad: composer + pestanas (Comunidad / Mi zona /
 * Siguiendo) + filtros de categoria + lista de publicaciones con busqueda en tiempo real.
 */
export const Feed = ({ busqueda = '' }: FeedProps) => {
  const navigate = useNavigate()
  const { usuario } = useSesion()
  const [filtro, setFiltro] = useState<FiltroFeed>('comunidad')
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todos')
  const [posts, setPosts] = useState<Publicacion[]>([])
  const [siguiendo, setSiguiendo] = useState<string[]>([])
  const [cargando, setCargando] = useState(true)

  const miUid = usuario?.uid ?? null
  const miMunicipio = usuario?.municipio || inferirMunicipio(usuario?.zona) || usuario?.zona || null
  const claveSiguiendo = siguiendo.join(',')

  useEffect(() => {
    if (!miUid) {
      setSiguiendo([])
      return
    }
    return escucharSiguiendo(miUid, setSiguiendo)
  }, [miUid])

  useEffect(() => {
    if (!miUid) return
    if (filtro === 'siguiendo' && siguiendo.length === 0) {
      setPosts([])
      setCargando(false)
      return
    }
    if (filtro === 'zona' && !miMunicipio) {
      setPosts([])
      setCargando(false)
      return
    }
    setCargando(true)
    const desuscribir = escucharFeed(
      filtro,
      { municipio: miMunicipio, siguiendo, miUid },
      (lista) => {
        setPosts(lista)
        setCargando(false)
      },
    )
    return () => desuscribir()
  }, [filtro, miUid, miMunicipio, claveSiguiendo])

  const alternar = async (autorUid: string) => {
    if (!miUid) return
    try {
      await alternarSeguir(miUid, autorUid, siguiendo.includes(autorUid))
    } catch (err) {
      console.warn('Error al seguir/dejar de seguir:', err)
    }
  }

  // Filtrado compuesto: por categoría y por texto de búsqueda
  const postsFiltrados = posts.filter((pub) => {
    if (tipoFiltro === 'cartas' && pub.tipo !== 'carta') return false
    if (tipoFiltro === 'fotos' && (!pub.media || pub.media.length === 0)) return false
    if (tipoFiltro === 'avisos') {
      const texto = (pub.texto || '').toLowerCase()
      if (
        !texto.includes('#buscoequipo') &&
        !texto.includes('#faltauno') &&
        !texto.includes('#desafio') &&
        !texto.includes('#amistoso') &&
        !texto.includes('#resultado')
      ) {
        return false
      }
    }

    if (!busqueda?.trim()) return true
    const q = busqueda.trim().toLowerCase()
    const autor = `${pub.autorNombre} ${pub.autorApodo}`.toLowerCase()
    const texto = (pub.texto || '').toLowerCase()
    const zona = [pub.autorZona, pub.autorMunicipio].filter(Boolean).join(' ').toLowerCase()
    return autor.includes(q) || texto.includes(q) || zona.includes(q)
  })

  const vacio = () => {
    if (busqueda.trim()) {
      return `No se encontraron publicaciones que coincidan con "${busqueda}".`
    }
    if (tipoFiltro !== 'todos') {
      return `No hay publicaciones en la categoría seleccionada.`
    }
    if (filtro === 'siguiendo') {
      return 'Todavía no seguís a nadie. Tocá "Seguir" en un post para ver sus novedades acá.'
    }
    if (filtro === 'zona') {
      if (!miMunicipio) {
        return 'No declaraste tu partido/localidad. Cargalo en tu perfil para ver publicaciones de tu zona.'
      }
      return `Todavía no hay publicaciones en ${miMunicipio}. ¡Sé el primero de tu zona en compartir!`
    }
    return 'No hay publicaciones todavía. ¡Sé el primero en compartir algo!'
  }

  return (
    <section className="space-y-4">
      {usuario && <Composer />}

      {/* Pestañas de audiencia: Comunidad / Mi zona / Siguiendo */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 shadow-sm">
        {TABS.map(({ id, etiqueta, icono: Icono }) => {
          const activo = filtro === id
          return (
            <button
              key={id}
              onClick={() => setFiltro(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg transition-all cursor-pointer ${
                activo ? 'bg-emerald-500 text-zinc-950 shadow-md font-black' : 'text-zinc-200 hover:text-white font-bold'
              }`}
            >
              <Icono className={`w-3.5 h-3.5 ${activo ? 'text-zinc-950' : 'text-zinc-400'}`} />
              {etiqueta}
            </button>
          )
        })}
      </div>

      {/* Subfiltros por formato de contenido */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIAS_FILTRO.map(({ id, etiqueta, icono: Icono }) => {
          const activo = tipoFiltro === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTipoFiltro(id)}
              className={`flex items-center gap-1.5 text-xs py-1.5 px-3.5 rounded-full border transition-all shrink-0 cursor-pointer ${
                activo
                  ? 'bg-emerald-500 border-emerald-400 text-zinc-950 font-black shadow-md shadow-emerald-500/25'
                  : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700/90 text-white hover:text-white font-bold shadow-sm'
              }`}
            >
              <Icono className={`w-3.5 h-3.5 ${activo ? 'text-zinc-950' : 'text-emerald-400'}`} />
              <span>{etiqueta}</span>
            </button>
          )
        })}
      </div>

      {/* Indicador de Zona Activa */}
      {filtro === 'zona' && miMunicipio && (
        <div className="flex items-center justify-between bg-zinc-900 border border-emerald-500/20 rounded-xl px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Publicaciones de <strong className="text-white">{miMunicipio}</strong>
              {usuario?.zona && usuario.zona !== miMunicipio ? ` (${usuario.zona})` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/ajustes')}
            className="text-emerald-400 hover:text-emerald-300 font-bold text-[11px] underline cursor-pointer ml-2 whitespace-nowrap"
          >
            Cambiar zona
          </button>
        </div>
      )}

      {cargando ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Esqueleto className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Esqueleto className="h-3 w-1/3" />
                  <Esqueleto className="h-3 w-1/4" />
                </div>
              </div>
              <Esqueleto className="h-44 w-full" />
              <Esqueleto className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : postsFiltrados.length === 0 ? (
        filtro === 'zona' && !miMunicipio ? (
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-white font-bold text-base">No declaraste tu partido o localidad</h4>
              <p className="text-zinc-400 text-xs max-w-sm mx-auto">
                Cargalo en tu perfil para ver publicaciones de canchas, jugadores y equipos de tu zona.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/ajustes')}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2.5 rounded-xl text-xs font-black shadow-md transition cursor-pointer active:scale-95"
            >
              <MapPin className="w-4 h-4" />
              <span>Configurar mi zona en el perfil</span>
            </button>
          </div>
        ) : (
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 text-center space-y-2">
            <p className="text-zinc-300 text-sm font-medium">{vacio()}</p>
            {(busqueda.trim() || tipoFiltro !== 'todos') && (
              <button
                type="button"
                onClick={() => {
                  setTipoFiltro('todos')
                }}
                className="text-xs text-emerald-400 hover:underline font-bold"
              >
                Restablecer filtros
              </button>
            )}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {postsFiltrados.map((pub) => (
            <PostCard
              key={pub.id}
              publicacion={pub}
              siguiendo={siguiendo.includes(pub.autorUid)}
              onAlternarSeguir={miUid ? () => alternar(pub.autorUid) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  )
}

