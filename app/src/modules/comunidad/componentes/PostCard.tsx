import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2, MessageCircle, Send, Share2, Sparkles, Trash2, UserPlus, UserCheck } from 'lucide-react'
import { motion } from 'framer-motion'
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
  const [copiado, setCopiado] = useState(false)

  const esMio = usuario?.uid === pub.autorUid
  const media = pub.media ?? []
  const reacciones = pub.reacciones ?? {}
  const totalReacciones = pub.reaccionesCount ?? 0
  const totalComentarios = pub.comentariosCount ?? 0

  const irAlPerfil = () => {
    if (usuario && usuario.uid === pub.autorUid) {
      navigate('/perfil')
    } else {
      navigate(`/carta/${pub.autorUid}`)
    }
  }

  const compartirPost = async () => {
    const urlCompartir = `${window.location.origin}/carta/${pub.autorUid}`
    const textoCompartir = pub.texto
      ? `${pub.autorApodo} en Al Ángulo: "${pub.texto.slice(0, 80)}${pub.texto.length > 80 ? '...' : ''}"`
      : `Mirá la publicación de ${pub.autorApodo} en Al Ángulo ⚽`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Al Ángulo - Comunidad',
          text: textoCompartir,
          url: urlCompartir,
        })
        return
      } catch {
        // Fallback a clipboard si el usuario cancela o el navegador falla
      }
    }

    try {
      await navigator.clipboard.writeText(`${textoCompartir}\n${urlCompartir}`)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch (err) {
      console.warn('No se pudo copiar el enlace:', err)
    }
  }

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
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 26 }}
      whileHover={{ y: -2 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700/80 transition-shadow shadow-sm hover:shadow-md"
    >
      {/* Cabecera del autor */}
      <header className="flex items-center gap-3 p-4">
        <motion.button
          onClick={irAlPerfil}
          title="Ver perfil y carta del jugador"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700 hover:ring-2 hover:ring-amber-500/50 transition-all cursor-pointer"
        >
          {pub.autorFotoUrl?.startsWith('http') ? (
            <img src={pub.autorFotoUrl} alt={pub.autorApodo} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl">{pub.autorFotoUrl || pub.autorApodo.slice(0, 1).toUpperCase()}</span>
          )}
        </motion.button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={irAlPerfil}
              className="text-left font-black text-white hover:text-amber-400 truncate leading-tight cursor-pointer transition"
              title="Ver perfil y carta"
            >
              {pub.autorApodo}
            </button>
            {pub.tipo === 'carta' && (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> Ficha FUT
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
            {[pub.autorZona, pub.autorMunicipio].filter(Boolean).length > 0
              ? `📍 ${[pub.autorZona, pub.autorMunicipio].filter(Boolean).join(', ')} · `
              : ''}
            {tiempoRelativo(pub.createdAt)}
          </p>
        </div>
        {puedeSeguir && onAlternarSeguir && (
          <motion.button
            onClick={onAlternarSeguir}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`flex items-center gap-1.5 text-[11px] font-bold py-1.5 px-3 rounded-full border transition cursor-pointer ${
              siguiendo
                ? 'border-zinc-600 text-zinc-300 hover:border-red-500/60 hover:text-red-400'
                : 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            {siguiendo ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            {siguiendo ? 'Siguiendo' : 'Seguir'}
          </motion.button>
        )}
        {esMio && (
          <motion.button
            onClick={borrarPublicacion}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className="text-zinc-500 hover:text-red-400 transition p-1 cursor-pointer"
            aria-label="Borrar"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
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
          <div className="bg-black/40 flex justify-center">
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

      {/* Reacciones y Compartir */}
      <div className="px-4 py-3 flex items-center gap-2 flex-wrap border-t border-zinc-800 mt-3">
        {REACCIONES.map(({ tipo, emoji, etiqueta }) => {
          const activa = miReaccion === tipo
          const count = reacciones[tipo] ?? 0

          const estilosActivos: Record<TipoReaccion, string> = {
            gol: 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]',
            fuego: 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.3)]',
            mvp: 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
            like: 'bg-sky-500/20 border-sky-500 text-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.3)]',
            risa: 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.3)]',
          }

          return (
            <motion.button
              key={tipo}
              onClick={() => reaccionarA(tipo)}
              disabled={!usuario || reaccionando}
              title={etiqueta}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 450, damping: 20 }}
              className={`flex items-center gap-1 text-sm py-1.5 px-2.5 rounded-full border transition-colors disabled:opacity-50 cursor-pointer ${
                activa
                  ? estilosActivos[tipo]
                  : 'bg-zinc-800/60 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800'
              }`}
            >
              <span>{emoji}</span>
              {count > 0 && <span className={`text-[11px] font-bold ${activa ? 'font-black' : 'text-zinc-300'}`}>{count}</span>}
            </motion.button>
          )
        })}
        {totalReacciones > 0 && (
          <span className="text-[11px] text-zinc-500 font-medium ml-1">{totalReacciones} reacciones</span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <motion.button
            onClick={compartirPost}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`flex items-center gap-1.5 text-[11px] font-bold py-1.5 px-3 rounded-full border transition cursor-pointer ${
              copiado
                ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-400'
                : 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:text-white hover:border-zinc-500'
            }`}
            title="Compartir publicación"
          >
            {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiado ? 'Copiado' : 'Compartir'}</span>
          </motion.button>

          <motion.button
            onClick={() => setComentariosAbiertos((v) => !v)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-white py-1.5 px-2.5 rounded-full bg-zinc-800/60 border border-zinc-700 hover:border-zinc-500 transition cursor-pointer"
            title="Ver comentarios"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{totalComentarios}</span>
          </motion.button>
        </div>
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
            <motion.button
              onClick={enviarComentario}
              disabled={!borrador.trim() || enviandoComentario}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 p-2 rounded-xl disabled:opacity-40 transition cursor-pointer"
              aria-label="Enviar comentario"
            >
              {enviandoComentario ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </motion.button>
          </div>
        </div>
      )}
    </motion.article>
  )
}
