import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, MessageCircle, Send, Trash2, UserPlus, UserCheck } from 'lucide-react'
import { REACCIONES, type Comentario, type Publicacion, type TipoReaccion } from '@/domain'
import { aMillis } from '@/core/firestore'
import { useSesion } from '@/modules/auth/useSesion'
import { useConfirmar } from '@/modules/ui/overlays'
import { TarjetaJugador, type DatosTarjeta } from '@/modules/cuenta/componentes/TarjetaJugador'
import {
  comentar,
  eliminarPublicacion,
  escucharMiReaccion,
  listarComentarios,
  reaccionar,
} from '../repositorio'

const tiempoRelativo = (valor: unknown): string => {
  const ms = aMillis(valor)
  if (!ms) return 'recién'
  const seg = Math.floor((Date.now() - ms) / 1000)
  if (seg < 60) return 'recién'
  const min = Math.floor(seg / 60)
  if (min < 60) return `hace ${min} min`
  const hs = Math.floor(min / 60)
  if (hs < 24) return `hace ${hs} h`
  const dias = Math.floor(hs / 24)
  if (dias < 7) return `hace ${dias} d`
  return new Date(ms).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

interface Props {
  publicacion: Publicacion
  /** ¿Sigo al autor? (para pintar el boton Seguir/Siguiendo). */
  siguiendo?: boolean
  /** Alterna seguir/dejar de seguir al autor. */
  onAlternarSeguir?: () => void
}

/**
 * Arma la ficha `TarjetaJugador` de una publicacion tipo `carta` a partir del
 * snapshot guardado en el post + los datos del autor. Usa las MISMAS claves que
 * el perfil para que la carta del feed se vea identica a la de "Mi perfil".
 */
const datosCartaDe = (pub: Publicacion): DatosTarjeta => {
  const t = pub.tarjeta!
  return {
    nombre: pub.autorApodo,
    fotoUrl: pub.autorFotoUrl ?? '⚽',
    media: t.media,
    pos: (t.posicion ?? '--').slice(0, 3).toUpperCase(),
    edad: t.edad ?? '--',
    goles: t.goles,
    asistencias: t.asistencias,
    partidos: t.partidosJugados,
    pierna: (t.pierna ?? '--').slice(0, 3).toUpperCase(),
    equipoNombre: t.equipoNombre ?? '',
    shieldUrl: t.shieldUrl ?? null,
  }
}

/**
 * Tarjeta de una publicacion del muro: autor, texto, fotos, reacciones variadas
 * y comentarios (se cargan al abrir la seccion, no al montar, para no multiplicar
 * lecturas por cada post del feed).
 */
export const PostCard = ({ publicacion: pub, siguiendo, onAlternarSeguir }: Props) => {
  const { usuario } = useSesion()
  const navigate = useNavigate()
  const confirmar = useConfirmar()

  const [miReaccion, setMiReaccion] = useState<TipoReaccion | null>(null)
  const [reaccionando, setReaccionando] = useState(false)
  const [comentariosAbiertos, setComentariosAbiertos] = useState(false)
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [cargandoComentarios, setCargandoComentarios] = useState(false)
  const [borrador, setBorrador] = useState('')
  const [enviandoComentario, setEnviandoComentario] = useState(false)

  const esMio = usuario?.uid === pub.autorUid
  const media = pub.media ?? []
  const reacciones = pub.reacciones ?? {}
  const totalReacciones = pub.reaccionesCount ?? 0
  const totalComentarios = pub.comentariosCount ?? 0

  useEffect(() => {
    if (!usuario) return
    return escucharMiReaccion(pub.id, usuario.uid, setMiReaccion)
  }, [pub.id, usuario?.uid])

  useEffect(() => {
    if (!comentariosAbiertos) return
    let vivo = true
    setCargandoComentarios(true)
    listarComentarios(pub.id)
      .then((lista) => {
        if (vivo) setComentarios(lista)
      })
      .catch((err) => console.warn('Error al cargar comentarios:', err))
      .finally(() => {
        if (vivo) setCargandoComentarios(false)
      })
    return () => {
      vivo = false
    }
  }, [comentariosAbiertos, pub.id])

  const reaccionarA = async (tipo: TipoReaccion) => {
    if (!usuario || reaccionando) return
    setReaccionando(true)
    try {
      await reaccionar(pub.id, usuario.uid, tipo)
    } catch (err) {
      console.warn('Error al reaccionar:', err)
    } finally {
      setReaccionando(false)
    }
  }

  const enviarComentario = async () => {
    const limpio = borrador.trim()
    if (!limpio || !usuario || enviandoComentario) return
    setEnviandoComentario(true)
    try {
      await comentar(
        pub.id,
        {
          uid: usuario.uid,
          nombre: usuario.nombre,
          apodo: usuario.nombre,
          fotoUrl: usuario.fotoUrl,
        },
        limpio,
      )
      const lista = await listarComentarios(pub.id)
      setComentarios(lista)
      setBorrador('')
    } catch (err) {
      console.warn('Error al comentar:', err)
    } finally {
      setEnviandoComentario(false)
    }
  }

  const borrarPublicacion = async () => {
    const aceptar = await confirmar('¿Borrar esta publicación?', {
      titulo: 'Borrar publicación',
      textoConfirmar: 'Borrar',
      peligro: true,
    })
    if (!aceptar) return
    try {
      await eliminarPublicacion(pub.id)
    } catch (err) {
      console.warn('Error al borrar la publicacion:', err)
    }
  }

  const puedeSeguir = usuario && !esMio

  return (
    <article className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Cabecera del autor */}
      <header className="flex items-center gap-3 p-4">
        <button
          onClick={() => navigate(`/carta/${pub.autorUid}`)}
          className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700"
        >
          {pub.autorFotoUrl?.startsWith('http') ? (
            <img src={pub.autorFotoUrl} alt={pub.autorApodo} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl">{pub.autorFotoUrl || pub.autorApodo.slice(0, 1).toUpperCase()}</span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <button onClick={() => navigate(`/carta/${pub.autorUid}`)} className="block text-left">
            <p className="font-black text-white truncate leading-tight">{pub.autorApodo}</p>
            <p className="text-[11px] text-zinc-400 truncate">
              {[pub.autorZona, pub.autorMunicipio].filter(Boolean).length > 0
                ? `📍 ${[pub.autorZona, pub.autorMunicipio].filter(Boolean).join(', ')} · `
                : ''}
              {tiempoRelativo(pub.createdAt)}
            </p>
          </button>
        </div>
        {puedeSeguir && onAlternarSeguir && (
          <button
            onClick={onAlternarSeguir}
            className={`flex items-center gap-1.5 text-[11px] font-bold py-1.5 px-3 rounded-full border transition ${
              siguiendo
                ? 'border-zinc-600 text-zinc-300 hover:border-red-500/60 hover:text-red-400'
                : 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            {siguiendo ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            {siguiendo ? 'Siguiendo' : 'Seguir'}
          </button>
        )}
        {esMio && (
          <button onClick={borrarPublicacion} className="text-zinc-500 hover:text-red-400 transition" aria-label="Borrar">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Texto */}
      {pub.texto && (
        <p className="px-4 pb-3 text-sm text-zinc-100 whitespace-pre-wrap break-words">{pub.texto}</p>
      )}

      {/* Carta compartida (snapshot): se pinta con la MISMA ficha que en el
          perfil (`TarjetaJugador`), no con un resumen aparte. */}
      {pub.tipo === 'carta' && pub.tarjeta && (
        <div className="flex justify-center px-4 pb-3">
          <TarjetaJugador datos={datosCartaDe(pub)} />
        </div>
      )}

      {/* Fotos */}
      {media.length > 0 &&
        (media.length === 1 ? (
          // Foto unica: se muestra COMPLETA (sin recorte), ajustada al ancho y
          // con altura tope para no desbordar la pantalla (estilo Facebook).
          <div className="bg-canvas flex justify-center">
            <img
              src={media[0]?.url}
              alt="Foto de la publicación"
              loading="lazy"
              className="w-full max-h-[75vh] object-contain"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-0.5">
            {media.map((m, i) => (
              <div key={`${m.url}-${i}`} className="bg-zinc-800 aspect-square">
                <img src={m.url} alt={`Foto ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ))}

      {/* Reacciones */}
      <div className="px-4 py-3 flex items-center gap-2 flex-wrap border-t border-zinc-800 mt-3">
        {REACCIONES.map(({ tipo, emoji, etiqueta }) => {
          const activa = miReaccion === tipo
          const count = reacciones[tipo] ?? 0
          return (
            <button
              key={tipo}
              onClick={() => reaccionarA(tipo)}
              disabled={!usuario || reaccionando}
              title={etiqueta}
              className={`flex items-center gap-1 text-sm py-1.5 px-2.5 rounded-full border transition active:scale-95 disabled:opacity-50 ${
                activa
                  ? 'bg-emerald-500/15 border-emerald-500/60'
                  : 'bg-zinc-800/60 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              <span>{emoji}</span>
              {count > 0 && <span className="text-[11px] font-bold text-zinc-300">{count}</span>}
            </button>
          )
        })}
        {totalReacciones > 0 && (
          <span className="text-[11px] text-zinc-500 font-medium ml-1">{totalReacciones} reacciones</span>
        )}
        <button
          onClick={() => setComentariosAbiertos((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-white ml-auto transition"
        >
          <MessageCircle className="w-4 h-4" />
          {totalComentarios}
        </button>
      </div>

      {/* Comentarios */}
      {comentariosAbiertos && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800 pt-3">
          {cargandoComentarios ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando comentarios...
            </div>
          ) : comentarios.length === 0 ? (
            <p className="text-xs text-zinc-500">Todavía no hay comentarios. Sé el primero.</p>
          ) : (
            <div className="space-y-2.5">
              {comentarios.map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                    {c.autorFotoUrl?.startsWith('http') ? (
                      <img src={c.autorFotoUrl} alt={c.autorApodo} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs">{c.autorFotoUrl || c.autorApodo.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="bg-zinc-800/70 rounded-xl px-3 py-2 flex-1 min-w-0">
                    <p className="text-[11px] font-black text-white">{c.autorApodo}</p>
                    <p className="text-xs text-zinc-200 break-words whitespace-pre-wrap">{c.texto}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              aria-label="Escribir un comentario"
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void enviarComentario()
              }}
              maxLength={280}
              placeholder="Escribí un comentario..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500/50"
            />
            <button
              onClick={enviarComentario}
              disabled={!borrador.trim() || enviandoComentario}
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 p-2 rounded-xl active:scale-95 disabled:opacity-40 transition"
              aria-label="Enviar comentario"
            >
              {enviandoComentario ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
