import { useEffect, useState } from 'react'
import { Globe, MapPin, UserCheck } from 'lucide-react'
import { useSesion } from '@/modules/auth/useSesion'
import type { Publicacion } from '@/domain'
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

/**
 * Muro social de la comunidad: composer + pestanas (Comunidad / Mi zona /
 * Siguiendo) + lista de publicaciones con reacciones y comentarios.
 */
export const Feed = () => {
  const { usuario } = useSesion()
  const [filtro, setFiltro] = useState<FiltroFeed>('comunidad')
  const [posts, setPosts] = useState<Publicacion[]>([])
  const [siguiendo, setSiguiendo] = useState<string[]>([])
  const [cargando, setCargando] = useState(true)

  const miUid = usuario?.uid ?? null
  const miMunicipio = usuario?.municipio ?? null
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
    // "Siguiendo" sin nadie a quien seguir se resuelve con un estado vacio, no
    // con la query. "Mi zona" sin municipio declarado, idem: no drop a comunidad.
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

  const vacio = () => {
    if (filtro === 'siguiendo') {
      return 'Todavía no seguís a nadie. Tocá "Seguir" en un post para ver sus novedades acá.'
    }
    if (filtro === 'zona') {
      return 'No declaraste tu partido/localidad. Cargalo en tu perfil para ver publicaciones de tu zona.'
    }
    return 'No hay publicaciones todavía. ¡Sé el primero en compartir algo!'
  }

  return (
    <section className="space-y-4">
      {usuario && <Composer />}

      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
        {TABS.map(({ id, etiqueta, icono: Icono }) => {
          const activo = filtro === id
          return (
            <button
              key={id}
              onClick={() => setFiltro(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg transition ${
                activo ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icono className="w-3.5 h-3.5" />
              {etiqueta}
            </button>
          )
        })}
      </div>

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
      ) : posts.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 text-center">
          <p className="text-zinc-400 text-sm">{vacio()}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((pub) => (
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
