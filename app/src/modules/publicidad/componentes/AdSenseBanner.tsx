import React, { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'

interface AdSenseBannerProps {
  /** ID del bloque de anuncios de AdSense (ej: "1234567890"). Si no se pasa, usa auto/default */
  slotId?: string
  /** Formato del anuncio: 'auto' (predeterminado), 'fluid' (para In-feed), 'horizontal', etc. */
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal'
  /** Para anuncios nativos In-feed (opcional) */
  layoutKey?: string
  /** Clases CSS adicionales para el contenedor */
  className?: string
}

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

const CLIENT_ID = 'ca-pub-7558809644534817'
const DEFAULT_SLOT_ID = '8870907323' // Bloque MURO creado en AdSense

export const AdSenseBanner: React.FC<AdSenseBannerProps> = ({
  slotId = DEFAULT_SLOT_ID,
  format = 'auto',
  layoutKey,
  className = '',
}) => {
  const adRef = useRef<HTMLModElement | null>(null)
  const isLoadedRef = useRef(false)
  const [errorCarga, setErrorCarga] = useState(false)

  const isDev = import.meta.env.DEV

  useEffect(() => {
    if (isDev) return

    // Evitar múltiples llamadas en React o re-renders
    if (isLoadedRef.current) return
    if (adRef.current && (adRef.current.getAttribute('data-ad-status') || adRef.current.children.length > 0)) {
      isLoadedRef.current = true
      return
    }

    try {
      if (typeof window !== 'undefined') {
        const ads = (window.adsbygoogle = window.adsbygoogle || [])
        ads.push({})
        isLoadedRef.current = true
      }
    } catch (err) {
      console.debug('[AdSense] Anuncio no cargado aún o bloqueado:', err)
      setErrorCarga(true)
    }
  }, [isDev])

  return (
    <div
      className={`bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 overflow-hidden shadow-sm transition-all my-3 ${className}`}
    >
      {/* Encabezado sutil de Publicidad */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
          <Sparkles className="w-3 h-3 text-amber-500/70" />
          <span>Publicidad</span>
        </div>
        <span className="text-[10px] text-zinc-500 font-medium">Google AdSense</span>
      </div>

      {/* Contenedor del Anuncio */}
      <div className="w-full min-h-[90px] flex items-center justify-center overflow-hidden">
        {isDev ? (
          // En modo desarrollo mostramos un banner visual de prueba para verificar diseño y responsividad
          <div className="w-full py-4 px-3 bg-zinc-950/60 border border-dashed border-zinc-800 rounded-xl text-center space-y-1">
            <p className="text-xs font-bold text-zinc-400">
              Espacio publicitario reservado (AdSense)
            </p>
            <p className="text-[10px] text-zinc-500 font-mono">
              Cliente: {CLIENT_ID} {slotId ? `| Slot: ${slotId}` : '| Formato: ' + format}
            </p>
            <p className="text-[10px] text-amber-500/80">
              (En producción se mostrará el anuncio real de Google)
            </p>
          </div>
        ) : (
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: 'block', minWidth: '250px' }}
            data-ad-client={CLIENT_ID}
            {...(slotId ? { 'data-ad-slot': slotId } : {})}
            {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
            data-ad-format={format}
            data-full-width-responsive="true"
          />
        )}
      </div>

      {errorCarga && !isDev && (
        <div className="text-center py-2 text-[10px] text-zinc-500">
          Publicidad de la comunidad
        </div>
      )}
    </div>
  )
}
