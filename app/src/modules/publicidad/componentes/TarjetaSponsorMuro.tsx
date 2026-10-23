import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Sparkles, MessageCircle } from 'lucide-react'
import type { AnuncioSponsor } from '@/domain/publicidad'
import { normalizarUrlImagen, normalizarEnlaceDestino } from '@/domain/publicidad'
import { registrarClickAnuncio, registrarVistaAnuncio } from '../repositorio'

interface TarjetaSponsorMuroProps {
  anuncio: AnuncioSponsor
}

export const TarjetaSponsorMuro: React.FC<TarjetaSponsorMuroProps> = ({ anuncio }) => {
  const vistaRegistradaRef = useRef(false)
  const enlaceFinal = normalizarEnlaceDestino(anuncio.enlaceDestino)

  useEffect(() => {
    if (!vistaRegistradaRef.current) {
      vistaRegistradaRef.current = true
      registrarVistaAnuncio(anuncio.id)
    }
  }, [anuncio.id])

  const handleClick = () => {
    registrarClickAnuncio(anuncio.id)
    window.open(enlaceFinal, '_blank', 'noopener,noreferrer')
  }

  const esWhatsApp = enlaceFinal.includes('wa.me') || enlaceFinal.includes('whatsapp')

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border border-amber-500/30 hover:border-amber-500/50 rounded-2xl overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.4)] transition-all"
    >
      {/* Header del Sponsor */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-zinc-950 font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
            {anuncio.logoUrl || '⭐'}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-sm text-white">{anuncio.nombreSponsor}</span>
              <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                {anuncio.etiquetaBadge || 'Sponsor Oficial'}
              </span>
              {anuncio.zona && anuncio.zona !== 'todas' && (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  📍 {anuncio.zona}
                </span>
              )}
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">Publicidad sugerida de Fulbeando</span>
          </div>
        </div>
      </div>

      {/* Contenido / Texto */}
      <div className="p-4 pb-2">
        <h4 className="text-base font-black text-white mb-1.5 leading-snug">
          {anuncio.titulo}
        </h4>
        <p className="text-xs text-zinc-300 leading-relaxed font-normal">
          {anuncio.descripcion}
        </p>
      </div>

      {/* Imagen / Flyer del Anuncio */}
      {anuncio.imagenUrl && (
        <div
          className="relative w-full h-52 sm:h-64 bg-zinc-950 overflow-hidden cursor-pointer group"
          onClick={handleClick}
        >
          <img
            src={normalizarUrlImagen(anuncio.imagenUrl)}
            alt={anuncio.titulo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
            <span className="text-white text-xs font-bold flex items-center gap-1">
              <span>{anuncio.textoBoton || 'Más información'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      )}

      {/* Footer con Botón de Acción Principal */}
      <div className="p-3.5 bg-zinc-950/80 border-t border-zinc-800/80 flex items-center justify-between gap-3">
        <span className="text-[11px] text-zinc-500 font-semibold truncate">
          {new URL(anuncio.enlaceDestino.startsWith('http') ? anuncio.enlaceDestino : `https://${anuncio.enlaceDestino}`).hostname.replace('www.', '')}
        </span>

        <motion.button
          type="button"
          onClick={handleClick}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer transition ${
            esWhatsApp
              ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
          }`}
        >
          {esWhatsApp ? <MessageCircle className="w-3.5 h-3.5 fill-current" /> : <ExternalLink className="w-3.5 h-3.5" />}
          <span>{anuncio.textoBoton || 'Ver Promo'}</span>
        </motion.button>
      </div>
    </motion.article>
  )
}
