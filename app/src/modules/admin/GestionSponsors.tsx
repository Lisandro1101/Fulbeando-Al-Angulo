import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  MousePointerClick,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  MessageCircle,
} from 'lucide-react'
import type { AnuncioSponsor, UbicacionAnuncio } from '@/domain/publicidad'
import { normalizarUrlImagen, normalizarEnlaceDestino } from '@/domain/publicidad'
import {
  obtenerTodosLosAnuncios,
  crearAnuncio,
  actualizarAnuncio,
  eliminarAnuncio,
} from '@/modules/publicidad/repositorio'

export const GestionSponsors: React.FC = () => {
  const [anuncios, setAnuncios] = useState<AnuncioSponsor[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarModalAlta, setMostrarModalAlta] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Formulario nuevo sponsor
  const [nombreSponsor, setNombreSponsor] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [imagenUrl, setImagenUrl] = useState('')
  const [previewError, setPreviewError] = useState(false)
  const [enlaceDestino, setEnlaceDestino] = useState('')
  const [textoBoton, setTextoBoton] = useState('Pedir Descuento por WhatsApp')
  const [ubicacion, setUbicacion] = useState<UbicacionAnuncio>('muro')
  const [zona, setZona] = useState<string>('todas')
  const [etiquetaBadge, setEtiquetaBadge] = useState('Sponsor Oficial')
  const [errorModal, setErrorModal] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const lista = await obtenerTodosLosAnuncios()
      setAnuncios(lista)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const handleToggleActivo = async (anuncio: AnuncioSponsor) => {
    try {
      await actualizarAnuncio(anuncio.id, { activo: !anuncio.activo })
      setAnuncios((prev) =>
        prev.map((a) => (a.id === anuncio.id ? { ...a, activo: !a.activo } : a)),
      )
    } catch (e) {
      console.error('Error al cambiar estado de anuncio:', e)
    }
  }

  const handleEliminar = async (id: string) => {
    if (!window.confirm('¿Eliminar este sponsor del sistema?')) return
    try {
      await eliminarAnuncio(id)
      setAnuncios((prev) => prev.filter((a) => a.id !== id))
    } catch (e) {
      console.error('Error al eliminar anuncio:', e)
    }
  }

  const handleSubmitNuevo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombreSponsor.trim() || !titulo.trim() || !enlaceDestino.trim()) return

    setGuardando(true)
    setErrorModal(null)
    try {
      const finalImagen =
        normalizarUrlImagen(imagenUrl) ||
        'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80'
      const finalEnlace = normalizarEnlaceDestino(enlaceDestino)

      const nuevoId = await crearAnuncio({
        nombreSponsor: nombreSponsor.trim(),
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        imagenUrl: finalImagen,
        enlaceDestino: finalEnlace,
        textoBoton: textoBoton.trim() || 'Ver Más',
        ubicacion,
        zona: zona === 'todas' ? null : zona.trim(),
        etiquetaBadge: etiquetaBadge.trim() || 'Sponsor Oficial',
        activo: true,
      })

      setAnuncios((prev) => [
        {
          id: nuevoId,
          nombreSponsor: nombreSponsor.trim(),
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          imagenUrl: finalImagen,
          enlaceDestino: finalEnlace,
          textoBoton: textoBoton.trim() || 'Ver Más',
          ubicacion,
          zona: zona === 'todas' ? null : zona.trim(),
          etiquetaBadge: etiquetaBadge.trim() || 'Sponsor Oficial',
          activo: true,
          clicks: 0,
          vistas: 0,
          creadoEn: Date.now(),
        },
        ...prev,
      ])

      setMostrarModalAlta(false)
      setNombreSponsor('')
      setTitulo('')
      setDescripcion('')
      setImagenUrl('')
      setPreviewError(false)
      setEnlaceDestino('')
      setZona('todas')
    } catch (err: any) {
      console.error('Error creando sponsor:', err)
      setErrorModal(err?.message || 'Error al guardar el sponsor en Firestore.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section id="sponsors" className="bg-pitch-900 border border-pitch-700 rounded-xl shadow-lg p-6 mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-pitch-700">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-xl font-bold text-white">Publicidad Nativa & Sponsors ({anuncios.length})</h3>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Gestioná los anunciantes locales que aparecen en el Muro de la Comunidad y en el Tercer Tiempo de los equipos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMostrarModalAlta(true)}
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer shrink-0 uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Sponsor</span>
        </button>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center p-8 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : anuncios.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No hay sponsors cargados todavía.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {anuncios.map((a) => (
            <div
              key={a.id}
              className={`border rounded-xl p-4 flex flex-col justify-between gap-3 transition-all ${
                a.activo ? 'bg-[#05080E] border-pitch-700' : 'bg-zinc-950/40 border-zinc-800 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                      {a.ubicacion === 'muro' ? '📰 Muro' : a.ubicacion === 'tercer_tiempo' ? '🍻 Tercer Tiempo' : '📍 Radar'}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-300 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-md">
                      {a.zona ? `📍 ${a.zona}` : '🌍 Todas'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleToggleActivo(a)}
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition ${
                      a.activo
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {a.activo ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{a.activo ? 'Activo' : 'Pausado'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <h4 className="font-black text-base text-white truncate">{a.nombreSponsor}</h4>
                </div>
                <p className="font-bold text-xs text-amber-200 mb-1">{a.titulo}</p>
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">{a.descripcion}</p>

                {a.imagenUrl && (
                  <img
                    src={normalizarUrlImagen(a.imagenUrl)}
                    alt={a.nombreSponsor}
                    className="w-full h-28 object-cover rounded-lg mb-3 border border-zinc-800"
                  />
                )}
              </div>

              <div>
                {/* Métricas de Clics y Vistas */}
                <div className="grid grid-cols-2 gap-2 bg-pitch-800/60 border border-pitch-700/60 rounded-lg p-2 text-center mb-3">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-gray-300">
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>{a.vistas || 0} vistas</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-bold">
                    <MousePointerClick className="w-3.5 h-3.5" />
                    <span>{a.clicks || 0} clics</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-pitch-700">
                  <a
                    href={normalizarEnlaceDestino(a.enlaceDestino)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 font-bold truncate"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">Ver enlace</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => void handleEliminar(a.id)}
                    className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                    title="Eliminar sponsor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Alta de Sponsor */}
      <AnimatePresence>
        {mostrarModalAlta && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-amber-500/50 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative text-left overflow-y-auto max-h-[90vh]"
            >
              <button
                type="button"
                onClick={() => setMostrarModalAlta(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-black text-white mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Nuevo Sponsor o Campaña</span>
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Completá los datos del sponsor para publicarlo inmediatamente en la app.
              </p>

              <form onSubmit={handleSubmitNuevo} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Nombre del Sponsor / Comercio *</label>
                  <input
                    type="text"
                    required
                    value={nombreSponsor}
                    onChange={(e) => setNombreSponsor(e.target.value)}
                    placeholder="Ej: Cervecería La Cancha, Botines Pro..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Título de la Promoción *</label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej: 20% OFF en tu mesa post-partido 🍻"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Descripción / Mensaje</label>
                  <textarea
                    rows={2}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Explicá la oferta o beneficio para los jugadores..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-amber-400 outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Ubicación</label>
                    <select
                      value={ubicacion}
                      onChange={(e) => setUbicacion(e.target.value as UbicacionAnuncio)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400 outline-none"
                    >
                      <option value="muro">Muro Social (Comunidad)</option>
                      <option value="tercer_tiempo">Tercer Tiempo (Mi Equipo)</option>
                      <option value="radar">Mapa Radar</option>
                      <option value="global">Todas las ubicaciones</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Etiqueta Badge</label>
                    <input
                      type="text"
                      value={etiquetaBadge}
                      onChange={(e) => setEtiquetaBadge(e.target.value)}
                      placeholder="Ej: Sponsor Oficial"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Zona Geográfica (Segmentación)</label>
                    <select
                      value={zona}
                      onChange={(e) => setZona(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400 outline-none"
                    >
                      <option value="todas">🌍 Todas las Zonas (Alcance Global)</option>
                      <optgroup label="CABA">
                        <option value="Palermo">Palermo</option>
                        <option value="Caballito">Caballito</option>
                        <option value="Belgrano">Belgrano</option>
                        <option value="Boedo">Boedo</option>
                        <option value="Villa Crespo">Villa Crespo</option>
                        <option value="Almagro">Almagro</option>
                        <option value="Recoleta">Recoleta</option>
                      </optgroup>
                      <optgroup label="GBA Zona Sur">
                        <option value="Lomas de Zamora">Lomas de Zamora</option>
                        <option value="Banfield">Banfield</option>
                        <option value="Temperley">Temperley</option>
                        <option value="Lanús">Lanús</option>
                        <option value="Adrogué">Adrogué</option>
                        <option value="Avellaneda">Avellaneda</option>
                        <option value="Quilmes">Quilmes</option>
                        <option value="Berazategui">Berazategui</option>
                        <option value="Monte Grande">Monte Grande</option>
                        <option value="Ezeiza">Ezeiza</option>
                      </optgroup>
                      <optgroup label="GBA Oeste">
                        <option value="Morón">Morón</option>
                        <option value="Castelar">Castelar</option>
                        <option value="Ramos Mejía">Ramos Mejía</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Otra Zona / Barrio libre</label>
                    <input
                      type="text"
                      placeholder="Opcional: ingresá otra zona..."
                      value={zona === 'todas' ? '' : zona}
                      onChange={(e) => setZona(e.target.value.trim() ? e.target.value : 'todas')}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-300">URL de Imagen / Flyer (opcional)</label>
                    <span className="text-[10px] text-amber-400 font-medium">Compatible con Google Drive público</span>
                  </div>
                  <input
                    type="url"
                    value={imagenUrl}
                    onChange={(e) => {
                      setImagenUrl(e.target.value)
                      setPreviewError(false)
                    }}
                    placeholder="https://drive.google.com/file/d/... o https://..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-amber-400 outline-none"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Pegá un enlace directo (.png, .jpg) o el link de compartir de Google Drive (debe estar en <em>"Cualquier persona con el enlace"</em>).
                  </p>

                  {/* Previsualización en vivo */}
                  {imagenUrl.trim() && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Vista previa del flyer
                        </span>
                        {imagenUrl.includes('drive.google.com') && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                            ⚡ Drive detectado (convertido a imagen directa)
                          </span>
                        )}
                      </div>

                      <div className="relative w-full h-36 bg-black/60 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-800">
                        <img
                          src={normalizarUrlImagen(imagenUrl)}
                          alt="Vista previa del flyer"
                          className="w-full h-full object-cover"
                          onError={() => setPreviewError(true)}
                          onLoad={() => setPreviewError(false)}
                        />
                        {previewError && (
                          <div className="absolute inset-0 bg-zinc-950/90 p-3 flex flex-col items-center justify-center text-center">
                            <p className="text-xs text-rose-400 font-semibold mb-1">⚠️ No se pudo cargar la imagen</p>
                            <p className="text-[11px] text-gray-400 leading-tight">
                              Si es de Google Drive, asegurate de que en "Compartir" esté configurado como <strong>"Cualquier persona con el enlace (Lector)"</strong>.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Enlace de Destino (Web o WhatsApp) *</label>
                    <input
                      type="text"
                      required
                      value={enlaceDestino}
                      onChange={(e) => setEnlaceDestino(e.target.value)}
                      placeholder="wa.me/54911... o https://..."
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-amber-400 outline-none"
                    />
                    {enlaceDestino.trim() && (
                      <p className="text-[11px] text-zinc-400 mt-1 truncate">
                        🔗 Redirigirá a:{' '}
                        <span className="text-amber-400 font-mono font-medium">
                          {normalizarEnlaceDestino(enlaceDestino)}
                        </span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Texto del Botón</label>
                    <input
                      type="text"
                      value={textoBoton}
                      onChange={(e) => setTextoBoton(e.target.value)}
                      placeholder="Ej: Pedir por WhatsApp"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                {errorModal && (
                  <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
                    {errorModal}
                  </p>
                )}

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setMostrarModalAlta(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white rounded-xl bg-zinc-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="px-5 py-2 text-xs font-black text-zinc-950 rounded-xl bg-amber-500 hover:bg-amber-400 uppercase tracking-wider flex items-center gap-1.5 shadow-md"
                  >
                    {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publicar Sponsor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
