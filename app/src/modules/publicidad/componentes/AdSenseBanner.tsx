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
  /** Si es true, muestra un mockup visual en modo desarrollo (por defecto false para no ocupar espacio vacío) */
  mostrarMockupEnDev?: boolean
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
  mostrarMockupEnDev = false,
}) => {
  const adRef = useRef<HTMLModElement | null>(null)
  const isLoadedRef = useRef(false)
  const [adVisible, setAdVisible] = useState(false)
  const [sinAnuncio, setSinAnuncio] = useState(false)

  const isDev = import.meta.env.DEV

  useEffect(() => {
    // Si estamos en desarrollo y no se solicitó mockup explícito, no mostramos nada vacío
    if (isDev && !mostrarMockupEnDev) {
      setSinAnuncio(true)
      return
    }

    if (isDev && mostrarMockupEnDev) {
      setAdVisible(true)
      return
    }

    if (isLoadedRef.current) return

    const adElement = adRef.current
    if (!adElement) return

    // Observar cambios en el <ins> para detectar cuando Google inyecta el anuncio o si no hay inventario
    const observer = new MutationObserver(() => {
      const status = adElement.getAttribute('data-ad-status')
      const tieneIframe = adElement.querySelector('iframe') !== null
      const tieneContenido = adElement.children.length > 0

      if (status === 'unfilled') {
        // Google no tiene anuncios disponibles: ocultamos el contenedor por completo
        setSinAnuncio(true)
        setAdVisible(false)
      } else if (status === 'filled' || tieneIframe || tieneContenido) {
        // Anuncio recibido y renderizado con éxito
        setAdVisible(true)
        setSinAnuncio(false)
      }
    })

    observer.observe(adElement, {
      attributes: true,
      attributeFilter: ['data-ad-status'],
      childList: true,
      subtree: true,
    })

    // Timeout de seguridad: si en 3.5 segundos Google no cargó ningún anuncio, colapsamos el espacio
    const timerTimeout = setTimeout(() => {
      const status = adElement.getAttribute('data-ad-status')
      const tieneIframe = adElement.querySelector('iframe') !== null
      if (status === 'unfilled' || (!status && !tieneIframe)) {
        setSinAnuncio(true)
        setAdVisible(false)
      }
    }, 3500)

    try {
      if (typeof window !== 'undefined') {
        const ads = (window.adsbygoogle = window.adsbygoogle || [])
        ads.push({})
        isLoadedRef.current = true
      }
    } catch (err) {
      console.debug('[AdSense] Anuncio bloqueado o no disponible:', err)
      setSinAnuncio(true)
      setAdVisible(false)
    }

    return () => {
      observer.disconnect()
      clearTimeout(timerTimeout)
    }
  }, [isDev, mostrarMockupEnDev])

  // Si no hay anuncio para mostrar o fue rechazado/bloqueado, NO dejamos ningún espacio en blanco
  if (sinAnuncio) {
    return null
  }

  // En modo desarrollo con mockup explícito
  if (isDev && mostrarMockupEnDev) {
    return (
      <div className={`bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 overflow-hidden shadow-sm transition-all my-3 ${className}`}>
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/60">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-500/70" />
            <span>Publicidad</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-medium">Google AdSense</span>
        </div>
        <div className="w-full py-4 px-3 bg-zinc-950/60 border border-dashed border-zinc-800 rounded-xl text-center space-y-1">
          <p className="text-xs font-bold text-zinc-400">Espacio publicitario reservado (AdSense)</p>
          <p className="text-[10px] text-zinc-500 font-mono">Cliente: {CLIENT_ID}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`transition-all duration-300 ${
        adVisible
          ? `bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 overflow-hidden shadow-sm my-3 ${className}`
          : 'h-0 overflow-hidden opacity-0 pointer-events-none'
      }`}
    >
      {/* Encabezado sutil solo visible cuando el anuncio realmente cargó */}
      {adVisible && (
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/60">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-500/70" />
            <span>Publicidad</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-medium">Google AdSense</span>
        </div>
      )}

      {/* Tag oficial de Google AdSense */}
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
    </div>
  )
}
