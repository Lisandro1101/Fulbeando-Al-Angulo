import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Send, Sparkles, X, Hash, Globe } from 'lucide-react'
import { useSesion } from '@/modules/auth/useSesion'
import { nombreCompleto, type MediaPost } from '@/domain'
import { optimizeAvatarImage } from '@/imageCompressor'
import { uploadImageToR2 } from '@/uploader'
import { useDatosCarta } from '@/modules/cuenta/useDatosCarta'
import { crearPublicacion } from '../repositorio'

/** Tope de fotos por post (el MVP no tiene video). */
const MAX_FOTOS = 4

const HASHTAGS_POPULARES = [
  { tag: '#BuscoEquipo', label: 'Busco equipo' },
  { tag: '#FaltaUno', label: 'Falta 1' },
  { tag: '#Golazo', label: 'Golazo' },
  { tag: '#Desafío', label: 'Desafío' },
]

interface Borrador {
  file: File
  previewUrl: string
}

/**
 * Creador de publicaciones al estilo Facebook / Instagram:
 * - En el feed: una barra compacta de 1 sola línea (avatar + píldora "¿Qué pasó en la cancha hoy?").
 * - Al tocar: abre un modal enfocado ("Crear publicación") con todas las opciones (fotos, carta, hashtags).
 */
export const Composer = () => {
  const { usuario } = useSesion()
  const inputRef = useRef<HTMLInputElement>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [fotos, setFotos] = useState<Borrador[]>([])
  const [modoCarta, setModoCarta] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const { datos: datosCarta, snapshot: snapshotCarta } = useDatosCarta(usuario)

  if (!usuario) return null

  const esDueno = usuario.rol === 'dueno_predio'

  const cerrarModal = () => {
    if (publicando) return
    setModalAbierto(false)
    setError(null)
  }

  const agregarFotos = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const espacio = MAX_FOTOS - fotos.length
    const nuevas = Array.from(files)
      .slice(0, espacio)
      .map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
    setFotos((prev) => [...prev, ...nuevas])
  }

  const quitarFoto = (i: number) => {
    setFotos((prev) => {
      const copia = [...prev]
      const [fuera] = copia.splice(i, 1)
      if (fuera) URL.revokeObjectURL(fuera.previewUrl)
      return copia
    })
  }

  const insertarHashtag = (tag: string) => {
    setTexto((prev) => {
      if (prev.includes(tag)) return prev
      const separador = prev.trim() ? ' ' : ''
      return `${prev.trim()}${separador}${tag} `
    })
  }

  const publicar = async () => {
    const limpio = texto.trim()
    if ((!limpio && fotos.length === 0 && !modoCarta) || publicando) return
    setPublicando(true)
    setError(null)
    setProgreso(0)
    try {
      const media: MediaPost[] = []
      for (let i = 0; i < fotos.length; i++) {
        const borrador = fotos[i]
        if (!borrador) continue
        const blob = await optimizeAvatarImage(borrador.file, { maxSize: 1080, quality: 0.85, recortarCuadrado: false })
        const { publicUrl } = await uploadImageToR2(
          blob,
          `post_${Date.now()}_${i}.webp`,
          `posts/${usuario.uid}`,
          (p) => setProgreso(Math.round(((i + p / 100) / fotos.length) * 100)),
        )
        media.push({ url: publicUrl, tipo: 'imagen' })
      }

      await crearPublicacion({
        autorUid: usuario.uid,
        autorNombre: nombreCompleto(usuario) || usuario.nombre,
        autorApodo: usuario.nombre,
        autorFotoUrl: usuario.fotoUrl,
        autorZona: usuario.zona ?? null,
        autorMunicipio: usuario.municipio ?? null,
        tipo: modoCarta ? 'carta' : 'post',
        texto: limpio || null,
        media,
        ...(modoCarta ? { tarjeta: snapshotCarta } : {}),
      })

      fotos.forEach((f) => URL.revokeObjectURL(f.previewUrl))
      setTexto('')
      setFotos([])
      setModoCarta(false)
      setModalAbierto(false)
    } catch (err) {
      console.error('Error al publicar en la comunidad:', err)
      setError('No se pudo publicar. Revisá tu conexión e intentá otra vez.')
    } finally {
      setPublicando(false)
      setProgreso(0)
    }
  }

  const puedePublicar = (texto.trim().length > 0 || fotos.length > 0 || modoCarta) && !publicando

  return (
    <>
      {/* 1. BARRA COMPACTA EN EL FEED (ESTILO FACEBOOK / INSTAGRAM) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center gap-3 shadow-md hover:border-zinc-700/80 transition-all">
        {/* Avatar del usuario */}
        <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
          {usuario.fotoUrl?.startsWith('http') ? (
            <img src={usuario.fotoUrl} alt={usuario.nombre} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">{usuario.fotoUrl || usuario.nombre.slice(0, 1).toUpperCase()}</span>
          )}
        </div>

        {/* Píldora clickeable que abre el modal */}
        <button
          type="button"
          onClick={() => {
            setModoCarta(false)
            setModalAbierto(true)
          }}
          className="flex-1 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-left text-xs sm:text-sm px-4 py-2.5 rounded-full transition-all cursor-pointer border border-zinc-700/50 truncate"
        >
          ¿Qué pasó en la cancha hoy, {usuario.nombre}?
        </button>

        {/* Accesos rápidos discretos */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setModoCarta(false)
              setModalAbierto(true)
              setTimeout(() => inputRef.current?.click(), 100)
            }}
            className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition cursor-pointer"
            title="Subir foto"
          >
            <ImagePlus className="w-5 h-5 text-emerald-400" />
          </button>

          {!esDueno && (
            <button
              type="button"
              onClick={() => {
                setModoCarta(true)
                setModalAbierto(true)
              }}
              className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-full transition cursor-pointer"
              title="Compartir mi carta FUT"
            >
              <Sparkles className="w-5 h-5 text-amber-400" />
            </button>
          )}
        </div>
      </div>

      {/* 2. MODAL PARA CREAR PUBLICACIÓN (SE ABRE AL TOCAR) */}
      {modalAbierto && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col my-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
              <div className="w-8" /> {/* Espaciador balanceador */}
              <h3 className="font-black text-white text-base">Crear publicación</h3>
              <button
                type="button"
                onClick={cerrarModal}
                disabled={publicando}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo del modal */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Información del autor y selector de modo */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                    {usuario.fotoUrl?.startsWith('http') ? (
                      <img src={usuario.fotoUrl} alt={usuario.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">{usuario.fotoUrl || usuario.nombre.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm leading-tight">{usuario.nombre}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full mt-0.5">
                      <Globe className="w-3 h-3 text-emerald-400" /> Público
                    </span>
                  </div>
                </div>

                {/* Switch de modo si no es dueño */}
                {!esDueno && (
                  <div className="flex bg-zinc-800/80 p-0.5 rounded-xl border border-zinc-700/60">
                    <button
                      type="button"
                      onClick={() => setModoCarta(false)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        !modoCarta ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Post
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoCarta(true)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        modoCarta ? 'bg-amber-500 text-zinc-950 font-black shadow-sm' : 'text-zinc-400 hover:text-amber-400'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" /> Carta
                    </button>
                  </div>
                )}
              </div>

              {/* Textarea principal */}
              <textarea
                aria-label="Contenido de la publicación"
                autoFocus
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                maxLength={280}
                rows={4}
                placeholder={
                  modoCarta
                    ? 'Escribí un mensaje para acompañar tu carta FUT...'
                    : '¿Qué pasó en la cancha hoy? Contá algo a la comunidad...'
                }
                className="w-full resize-none bg-transparent border-none outline-none text-base text-zinc-100 placeholder-zinc-500 leading-relaxed"
              />

              {/* Preview de carta si está activada */}
              {modoCarta && (
                <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex flex-col items-center justify-center text-zinc-950 font-black shadow-md">
                      <span className="text-sm leading-none">{datosCarta.media}</span>
                      <span className="text-[10px] tracking-wider uppercase">{datosCarta.pos}</span>
                    </div>
                    <div>
                      <p className="text-xs font-black text-amber-300">Se adjuntará tu Carta FUT congelada</p>
                      <p className="text-[11px] text-zinc-400">
                        Media {datosCarta.media} · {datosCarta.goles} goles · {datosCarta.partidos} partidos
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModoCarta(false)}
                    className="text-zinc-500 hover:text-white p-1 rounded-full cursor-pointer"
                    title="Quitar carta"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Previsualización de fotos */}
              {fotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {fotos.map((foto, i) => (
                    <div key={foto.previewUrl} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700">
                      <img src={foto.previewUrl} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => quitarFoto(i)}
                        className="absolute top-1 right-1 bg-black/75 rounded-full p-1 text-white hover:bg-black cursor-pointer"
                        aria-label="Quitar foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Chips de hashtags rápidos */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-bold text-zinc-500 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> Etiquetas populares:
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {HASHTAGS_POPULARES.map(({ tag, label }) => {
                    const activo = texto.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertarHashtag(tag)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border transition cursor-pointer ${
                          activo
                            ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300'
                            : 'border-zinc-800 bg-zinc-800/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Barra de progreso de subida */}
              {publicando && progreso > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Subiendo fotos...</span>
                    <span>{progreso}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progreso}%` }} />
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-red-400 font-medium bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">{error}</p>}
            </div>

            {/* Footer del modal: herramientas y botón publicar */}
            <div className="p-4 bg-zinc-950/40 border-t border-zinc-800 space-y-3">
              {/* Barra de adición (Fotos / Carta) */}
              <div className="flex items-center justify-between bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-4 py-2">
                <span className="text-xs font-bold text-zinc-300">Añadir a tu publicación</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={fotos.length >= MAX_FOTOS || publicando}
                    className="p-1.5 text-zinc-300 hover:text-emerald-400 hover:bg-zinc-700 rounded-lg transition disabled:opacity-40 cursor-pointer"
                    title="Añadir foto"
                  >
                    <ImagePlus className="w-5 h-5 text-emerald-400" />
                  </button>

                  {!esDueno && (
                    <button
                      type="button"
                      onClick={() => setModoCarta((v) => !v)}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        modoCarta ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-300 hover:text-amber-400 hover:bg-zinc-700'
                      }`}
                      title="Adjuntar mi carta FUT"
                    >
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    </button>
                  )}
                  <span className="text-[11px] text-zinc-500 font-mono ml-1">
                    {texto.length}/280
                  </span>
                </div>
              </div>

              {/* Botón publicar a lo ancho */}
              <button
                type="button"
                onClick={publicar}
                disabled={!puedePublicar}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-black py-3 px-4 rounded-xl active:scale-95 disabled:opacity-40 transition cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                {publicando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{publicando ? 'Publicando...' : 'Publicar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input de archivo oculto */}
      <input
        aria-label="Adjuntar foto"
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          agregarFotos(e.target.files)
          e.target.value = ''
        }}
      />
    </>
  )
}
