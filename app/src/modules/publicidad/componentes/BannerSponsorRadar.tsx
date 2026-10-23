import React, { useEffect, useState, useMemo, useRef } from 'react'
import { Sparkles, ExternalLink, X, ChevronDown, ChevronUp, MapPin, MessageCircle } from 'lucide-react'
import type { AnuncioSponsor } from '@/domain/publicidad'
import { normalizarUrlImagen, normalizarEnlaceDestino } from '@/domain/publicidad'
import {
  escucharAnunciosActivos,
  registrarClickAnuncio,
  registrarVistaAnuncio,
} from '@/modules/publicidad/repositorio'
import { useSesion } from '@/modules/auth/useSesion'
import { inferirMunicipio } from '@/core/geo/zonas'

interface Props {
  className?: string
  /** Segundos que dura cada publicidad antes de pasar a la siguiente (por defecto: 10s) */
  segundosRotacion?: number
}

export const BannerSponsorRadar: React.FC<Props> = ({
  className = '',
  segundosRotacion = 10,
}) => {
  const { usuario } = useSesion()
  const [anuncios, setAnuncios] = useState<AnuncioSponsor[]>([])
  const [indiceActual, setIndiceActual] = useState<number>(0)
  const [oculto, setOculto] = useState<boolean>(false)
  const [minimizado, setMinimizado] = useState<boolean>(false)
  const [pausado, setPausado] = useState<boolean>(false)
  const vistasRegistradasRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const unsub = escucharAnunciosActivos('radar', (lista) => {
      setAnuncios(lista)
      setIndiceActual(0)
    })

    return () => unsub()
  }, [])

  // Filtrar y ordenar anuncios priorizando la zona/barrio del usuario
  const anunciosFiltrados = useMemo(() => {
    if (anuncios.length === 0) return []
    const zonaUser = (usuario?.zona || '').trim().toLowerCase()
    const muniUser = (usuario?.municipio || inferirMunicipio(usuario?.zona) || '').trim().toLowerCase()

    if (!zonaUser && !muniUser) {
      return anuncios
    }

    const exactos: AnuncioSponsor[] = []
    const globales: AnuncioSponsor[] = []
    const otros: AnuncioSponsor[] = []

    for (const a of anuncios) {
      const zonaA = (a.zona || '').trim().toLowerCase()
      if (!zonaA || zonaA === 'todas' || zonaA === 'global') {
        globales.push(a)
      } else if (
        (zonaUser && (zonaA === zonaUser || zonaA.includes(zonaUser) || zonaUser.includes(zonaA))) ||
        (muniUser && (zonaA === muniUser || inferirMunicipio(a.zona)?.toLowerCase() === muniUser))
      ) {
        exactos.push(a)
      } else {
        otros.push(a)
      }
    }

    // Priorizamos primero sponsors de la zona del usuario, luego sponsors globales de alcance general
    const combinados = [...exactos, ...globales]
    return combinados.length > 0 ? combinados : otros
  }, [anuncios, usuario?.zona, usuario?.municipio])

  const total = anunciosFiltrados.length
  const anuncioActual = total > 0 ? anunciosFiltrados[indiceActual % total] : null

  // Rotación automática cada N segundos (se pausa si el usuario hace hover para leer o interactuar)
  useEffect(() => {
    if (total <= 1 || pausado || minimizado || oculto) return

    const timer = setInterval(() => {
      setIndiceActual((prev) => (prev + 1) % total)
    }, segundosRotacion * 1000)

    return () => clearInterval(timer)
  }, [total, pausado, minimizado, oculto, segundosRotacion])

  // Registro de vista única por ID de anuncio durante la sesión
  useEffect(() => {
    if (anuncioActual && !vistasRegistradasRef.current.has(anuncioActual.id)) {
      vistasRegistradasRef.current.add(anuncioActual.id)
      void registrarVistaAnuncio(anuncioActual.id)
    }
  }, [anuncioActual?.id])

  if (!anuncioActual || oculto) return null

  const enlaceFinal = normalizarEnlaceDestino(anuncioActual.enlaceDestino)
  const esWhatsApp = enlaceFinal.includes('wa.me') || enlaceFinal.includes('whatsapp')

  const handleClick = () => {
    void registrarClickAnuncio(anuncioActual.id)
    window.open(enlaceFinal, '_blank', 'noopener,noreferrer')
  }

  // Vista compacta / minimizada (Pill sutil)
  if (minimizado) {
    return (
      <div className={`pointer-events-auto z-20 flex justify-center ${className}`}>
        <button
          onClick={() => setMinimizado(false)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/90 backdrop-blur-md border border-amber-500/40 text-xs font-bold text-amber-300 shadow-lg shadow-black/50 hover:bg-zinc-900 transition active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
          <span className="truncate max-w-[180px] sm:max-w-xs">{anuncioActual.nombreSponsor}</span>
          {anuncioActual.zona && anuncioActual.zona !== 'todas' && (
            <span className="text-[10px] text-amber-400/90 font-medium">📍 {anuncioActual.zona}</span>
          )}
          <span className="text-[10px] text-zinc-400 font-normal">| Ver promo</span>
          <ChevronDown className="w-3 h-3 text-zinc-400" />
        </button>
      </div>
    )
  }

  return (
    <div
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      className={`pointer-events-auto z-20 w-full max-w-lg transition-all duration-200 ${className}`}
    >
      <div className="relative overflow-hidden rounded-2xl bg-zinc-950/90 backdrop-blur-xl border border-amber-500/35 p-2.5 sm:p-3 shadow-[0_10px_35px_rgba(0,0,0,0.7)]">
        {/* Glow de fondo decorativo */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-2.5">
          {/* Imagen / Miniatura o Logo */}
          <div className="relative shrink-0 w-11 h-11 sm:w-13 sm:h-13 rounded-xl overflow-hidden border border-amber-500/30 bg-zinc-900 flex items-center justify-center">
            {anuncioActual.imagenUrl ? (
              <img
                src={normalizarUrlImagen(anuncioActual.imagenUrl)}
                alt={anuncioActual.nombreSponsor}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl sm:text-2xl">{anuncioActual.logoUrl || '⭐'}</span>
            )}
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
          </div>

          {/* Información del Anuncio */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                <Sparkles className="w-2.5 h-2.5" />
                {anuncioActual.etiquetaBadge || 'Sponsor Radar'}
              </span>

              {anuncioActual.zona && anuncioActual.zona !== 'todas' ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                  <MapPin className="w-2.5 h-2.5" />
                  {anuncioActual.zona}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-400 font-medium hidden sm:inline">
                  Alcance Global
                </span>
              )}

              <span className="text-xs font-bold text-zinc-300 truncate">
                {anuncioActual.nombreSponsor}
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
              {anuncioActual.titulo}
            </p>

            {anuncioActual.descripcion && (
              <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                {anuncioActual.descripcion}
              </p>
            )}
          </div>

          {/* Controles: Minimizar y Cerrar */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setMinimizado(true)}
              title="Minimizar anuncio"
              aria-label="Minimizar sponsor"
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setOculto(true)}
              title="Ocultar anuncio"
              aria-label="Cerrar sponsor"
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Footer: Indicadores de Rotación + Botón de Acción CTA */}
        <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
          {total > 1 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-zinc-400 mr-1 hidden sm:inline">
                {indiceActual + 1} de {total}
              </span>
              {anunciosFiltrados.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => setIndiceActual(i)}
                  aria-label={`Ver sponsor ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === indiceActual % total
                      ? 'w-5 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                      : 'w-1.5 bg-zinc-700 hover:bg-zinc-500'
                  }`}
                />
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-zinc-500 font-medium hidden sm:inline">
              Beneficio exclusivo para usuarios de Fulbeando
            </span>
          )}

          <button
            onClick={handleClick}
            className={`w-full sm:w-auto ml-auto px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer ${
              esWhatsApp
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-zinc-950 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 shadow-amber-500/20'
            }`}
          >
            <span>{anuncioActual.textoBoton || 'Ver Promo'}</span>
            {esWhatsApp ? (
              <MessageCircle className="w-3.5 h-3.5 shrink-0 fill-current" />
            ) : (
              <ExternalLink className="w-3 h-3 shrink-0" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
