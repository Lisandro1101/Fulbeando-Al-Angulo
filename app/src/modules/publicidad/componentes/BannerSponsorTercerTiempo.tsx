import React, { useEffect, useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Beer, Sparkles, ExternalLink, MessageCircle, MapPin } from 'lucide-react'
import type { AnuncioSponsor } from '@/domain/publicidad'
import { normalizarUrlImagen, normalizarEnlaceDestino } from '@/domain/publicidad'
import { escucharAnunciosActivos, registrarClickAnuncio, registrarVistaAnuncio } from '../repositorio'
import { useSesion } from '@/modules/auth/useSesion'
import { inferirMunicipio } from '@/core/geo/zonas'

interface Props {
  segundosRotacion?: number
}

export const BannerSponsorTercerTiempo: React.FC<Props> = ({ segundosRotacion = 10 }) => {
  const { usuario } = useSesion()
  const [anuncios, setAnuncios] = useState<AnuncioSponsor[]>([])
  const [indiceActual, setIndiceActual] = useState(0)
  const [pausado, setPausado] = useState(false)
  const vistaRegistradaRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const unsub = escucharAnunciosActivos('tercer_tiempo', (lista) => {
      setAnuncios(lista)
      setIndiceActual(0)
    })
    return () => unsub()
  }, [])

  // Filtrar y ordenar priorizando la zona del usuario
  const anunciosFiltrados = useMemo(() => {
    if (anuncios.length === 0) return []
    const zonaUser = (usuario?.zona || '').trim().toLowerCase()
    const muniUser = (usuario?.municipio || inferirMunicipio(usuario?.zona) || '').trim().toLowerCase()

    if (!zonaUser && !muniUser) return anuncios

    const exactos: AnuncioSponsor[] = []
    const globales: AnuncioSponsor[] = []
    const otros: AnuncioSponsor[] = []

    for (const a of anuncios) {
      const z = (a.zona || '').trim().toLowerCase()
      if (!z || z === 'todas' || z === 'global') {
        globales.push(a)
      } else if (
        (zonaUser && (z === zonaUser || z.includes(zonaUser) || zonaUser.includes(z))) ||
        (muniUser && (z === muniUser || inferirMunicipio(a.zona)?.toLowerCase() === muniUser))
      ) {
        exactos.push(a)
      } else {
        otros.push(a)
      }
    }
    const combinados = [...exactos, ...globales]
    return combinados.length > 0 ? combinados : otros
  }, [anuncios, usuario?.zona, usuario?.municipio])

  const total = anunciosFiltrados.length
  const anuncioActual = total > 0 ? anunciosFiltrados[indiceActual % total] : null

  // Rotación automática cada 10 segundos
  useEffect(() => {
    if (total <= 1 || pausado) return

    const timer = setInterval(() => {
      setIndiceActual((prev) => (prev + 1) % total)
    }, segundosRotacion * 1000)

    return () => clearInterval(timer)
  }, [total, pausado, segundosRotacion])

  useEffect(() => {
    if (anuncioActual && !vistaRegistradaRef.current.has(anuncioActual.id)) {
      vistaRegistradaRef.current.add(anuncioActual.id)
      void registrarVistaAnuncio(anuncioActual.id)
    }
  }, [anuncioActual?.id])

  if (!anuncioActual) return null

  const enlaceFinal = normalizarEnlaceDestino(anuncioActual.enlaceDestino)

  const handleClick = () => {
    void registrarClickAnuncio(anuncioActual.id)
    window.open(enlaceFinal, '_blank', 'noopener,noreferrer')
  }

  const esWhatsApp = enlaceFinal.includes('wa.me') || enlaceFinal.includes('whatsapp')

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      className="bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/40 rounded-2xl p-4 shadow-lg text-left relative overflow-hidden transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Beer className="w-3.5 h-3.5" />
            <span>{anuncioActual.etiquetaBadge || 'Promo de Tercer Tiempo'}</span>
          </span>
          {anuncioActual.zona && anuncioActual.zona !== 'todas' && (
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />
              <span>{anuncioActual.zona}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {total > 1 && (
            <span className="text-[10px] font-bold text-zinc-400">
              {indiceActual + 1}/{total}
            </span>
          )}
          <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Sponsor Oficial</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {anuncioActual.imagenUrl && (
          <img
            src={normalizarUrlImagen(anuncioActual.imagenUrl)}
            alt={anuncioActual.titulo}
            className="w-full sm:w-24 h-28 sm:h-24 rounded-xl object-cover shrink-0 border border-zinc-800"
          />
        )}

        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 block mb-0.5">
            {anuncioActual.nombreSponsor}
          </span>
          <h4 className="text-white font-black text-sm sm:text-base leading-snug mb-1">
            {anuncioActual.titulo}
          </h4>
          <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2">
            {anuncioActual.descripcion}
          </p>
        </div>

        <button
          onClick={handleClick}
          className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black text-xs py-2.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
        >
          {esWhatsApp ? <MessageCircle className="w-4 h-4 fill-zinc-950" /> : <ExternalLink className="w-4 h-4" />}
          <span>{anuncioActual.textoBoton || 'Pedir Beneficio'}</span>
        </button>
      </div>

      {/* Indicadores de rotación (dots) */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3 pt-2 border-t border-zinc-800/80">
          {anunciosFiltrados.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setIndiceActual(i)}
              aria-label={`Sponsor ${i + 1}`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === indiceActual % total ? 'w-5 bg-amber-400' : 'w-1.5 bg-zinc-700 hover:bg-zinc-500'
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}
