import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Send, X } from 'lucide-react'
import { useSesion } from '@/modules/auth/useSesion'
import { nombreCompleto, type MediaPost } from '@/domain'
import { optimizeAvatarImage } from '@/imageCompressor'
import { uploadImageToR2 } from '@/uploader'
import { crearPublicacion } from '../repositorio'

/** Tope de fotos por post (el MVP no tiene video). */
const MAX_FOTOS = 4

interface Borrador {
  file: File
  previewUrl: string
}

/**
 * Caja para publicar en el muro: texto libre + hasta 4 fotos.
 *
 * Las fotos se comprimen a WebP en el cliente (motor de `imageCompressor`) y
 * se suben con el uploader R2/Storage existente a `posts/{uid}/...`.
 */
export const Composer = () => {
  const { usuario } = useSesion()
  const inputRef = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState('')
  const [fotos, setFotos] = useState<Borrador[]>([])
  const [publicando, setPublicando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [error, setError] = useState<string | null>(null)

  if (!usuario) return null

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

  const publicar = async () => {
    const limpio = texto.trim()
    if ((!limpio && fotos.length === 0) || publicando) return
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
        tipo: 'post',
        texto: limpio || null,
        media,
      })

      fotos.forEach((f) => URL.revokeObjectURL(f.previewUrl))
      setTexto('')
      setFotos([])
    } catch (err) {
      console.error('Error al publicar en la comunidad:', err)
      setError('No se pudo publicar. Revisá tu conexión e intentá otra vez.')
    } finally {
      setPublicando(false)
      setProgreso(0)
    }
  }

  const puedePublicar = (texto.trim().length > 0 || fotos.length > 0) && !publicando

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
          {usuario.fotoUrl?.startsWith('http') ? (
            <img src={usuario.fotoUrl} alt={usuario.nombre} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">{usuario.fotoUrl || usuario.nombre.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <textarea
          aria-label="Texto de la publicación"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={280}
          rows={2}
          placeholder="¿Qué pasó en la cancha hoy? Contá algo a la comunidad..."
          className="flex-1 resize-none bg-transparent border-none outline-none text-sm text-zinc-100 placeholder-zinc-500"
        />
      </div>

      {fotos.length > 0 &&
        (fotos.length === 1 ? (
          <div className="relative rounded-lg overflow-hidden bg-canvas flex justify-center">
            <img src={fotos[0]?.previewUrl} alt="Vista previa" className="w-full max-h-[60vh] object-contain" />
            <button
              onClick={() => quitarFoto(0)}
              className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 text-white hover:bg-black"
              aria-label="Quitar foto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {fotos.map((foto, i) => (
              <div key={foto.previewUrl} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800">
                <img src={foto.previewUrl} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => quitarFoto(i)}
                  className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 text-white hover:bg-black"
                  aria-label="Quitar foto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ))}

      {publicando && progreso > 0 && (
        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progreso}%` }} />
        </div>
      )}

      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

      <div className="flex items-center justify-between">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={fotos.length >= MAX_FOTOS || publicando}
          className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white disabled:opacity-40 transition"
        >
          <ImagePlus className="w-4 h-4" /> Añadir foto ({fotos.length}/{MAX_FOTOS})
        </button>

        <button
          onClick={publicar}
          disabled={!puedePublicar}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black py-2 px-4 rounded-xl active:scale-95 disabled:opacity-40 transition"
        >
          {publicando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Publicar
        </button>
      </div>

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
    </div>
  )
}
