import { forwardRef, useId } from 'react'

/**
 * Datos que pinta la ficha. Es todo lo que la carta necesita saber: la carta no
 * consulta nada, asi que se puede reusar igual en el perfil propio
 * (`Screen4WelcomeCard`), en la carta publica (`/carta/:uid`) y en el feed.
 */
export interface DatosTarjeta {
  nombre: string
  fotoUrl: string
  media: number
  pos: string
  edad: number | string
  goles: number
  asistencias: number
  partidos: number
  pierna: string
  equipoNombre: string
  shieldUrl?: string | null
}

export type TierCarta = 'bronce' | 'plata' | 'oro' | 'especial' | 'icono'

export interface TemaCarta {
  tier: TierCarta
  nombreTier: string
  dropShadowClass: string
  fondoGradiente: string
  colorTexto: string
  colorLineaFuerte: string
  colorLineaMedia: string
  colorLineaSuave: string
  bordeFoto: string
  colorNombre: string
  colorFooter: string
  badgeMediaClass: string
}

export const obtenerTemaSegunMedia = (media: number): TemaCarta => {
  const m = typeof media === 'number' && !isNaN(media) ? media : 55

  // Tier 1: Bronce (media < 65)
  if (m < 65) {
    return {
      tier: 'bronce',
      nombreTier: 'BRONCE',
      dropShadowClass: 'drop-shadow-[0_15px_25px_rgba(140,86,46,0.45)]',
      fondoGradiente: 'bg-gradient-to-br from-[#c8986c] via-[#9e6d42] to-[#5a3618]',
      colorTexto: 'text-[#2e1908]',
      colorLineaFuerte: 'bg-[#4a2b13]',
      colorLineaMedia: 'bg-[#5a3618]/60',
      colorLineaSuave: 'bg-[#5a3618]/40',
      bordeFoto: 'border-[#9e6d42]',
      colorNombre: 'text-[#1e0f03]',
      colorFooter: 'text-[#3b200b]',
      badgeMediaClass: 'bg-gradient-to-br from-[#c8986c] to-[#6d401e] text-amber-100 border border-[#c8986c]/60 shadow-[0_0_10px_rgba(158,109,66,0.4)]',
    }
  }

  // Tier 2: Plata (65 a 74)
  if (m < 75) {
    return {
      tier: 'plata',
      nombreTier: 'PLATA',
      dropShadowClass: 'drop-shadow-[0_15px_25px_rgba(148,163,184,0.45)]',
      fondoGradiente: 'bg-gradient-to-br from-[#f8fafc] via-[#cbd5e1] to-[#64748b]',
      colorTexto: 'text-[#0f172a]',
      colorLineaFuerte: 'bg-[#334155]',
      colorLineaMedia: 'bg-[#475569]/60',
      colorLineaSuave: 'bg-[#475569]/40',
      bordeFoto: 'border-[#94a3b8]',
      colorNombre: 'text-[#020617]',
      colorFooter: 'text-[#1e293b]',
      badgeMediaClass: 'bg-gradient-to-br from-[#f1f5f9] to-[#64748b] text-slate-900 border border-slate-300 shadow-[0_0_10px_rgba(148,163,184,0.4)]',
    }
  }

  // Tier 3: Oro (75 a 84)
  if (m < 85) {
    return {
      tier: 'oro',
      nombreTier: 'ORO',
      dropShadowClass: 'drop-shadow-[0_15px_25px_rgba(245,158,11,0.45)]',
      fondoGradiente: 'bg-gradient-to-br from-[#fde68a] via-[#eab308] to-[#92400e]',
      colorTexto: 'text-[#2c2005]',
      colorLineaFuerte: 'bg-[#5c4a1e]',
      colorLineaMedia: 'bg-[#7a6427]/60',
      colorLineaSuave: 'bg-[#7a6427]/40',
      bordeFoto: 'border-[#e6b741]',
      colorNombre: 'text-[#1a1303]',
      colorFooter: 'text-[#2c2005]',
      badgeMediaClass: 'bg-gradient-to-br from-[#fde68a] to-[#b45309] text-amber-950 border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]',
    }
  }

  // Tier 4: Especial / In-Form / Black & Gold (85 a 89)
  if (m < 90) {
    return {
      tier: 'especial',
      nombreTier: 'IN-FORM',
      dropShadowClass: 'drop-shadow-[0_15px_30px_rgba(234,179,8,0.45)]',
      fondoGradiente: 'bg-gradient-to-br from-[#27272a] via-[#18181b] to-[#09090b]',
      colorTexto: 'text-[#fef08a]',
      colorLineaFuerte: 'bg-[#facc15]',
      colorLineaMedia: 'bg-[#eab308]/60',
      colorLineaSuave: 'bg-[#eab308]/40',
      bordeFoto: 'border-[#facc15] shadow-[0_0_15px_rgba(250,204,21,0.5)]',
      colorNombre: 'text-[#ffffff]',
      colorFooter: 'text-[#facc15]',
      badgeMediaClass: 'bg-gradient-to-br from-zinc-800 to-black text-amber-300 border border-amber-400 shadow-[0_0_12px_rgba(250,204,21,0.4)]',
    }
  }

  // Tier 5: Ícono / Leyenda (90 a 99)
  return {
    tier: 'icono',
    nombreTier: 'ÍCONO',
    dropShadowClass: 'drop-shadow-[0_15px_35px_rgba(56,189,248,0.55)]',
    fondoGradiente: 'bg-gradient-to-br from-[#1e1b4b] via-[#0f172a] to-[#0369a1]',
    colorTexto: 'text-[#7dd3fc]',
    colorLineaFuerte: 'bg-[#38bdf8]',
    colorLineaMedia: 'bg-[#38bdf8]/60',
    colorLineaSuave: 'bg-[#38bdf8]/40',
    bordeFoto: 'border-[#38bdf8] shadow-[0_0_20px_rgba(56,189,248,0.6)]',
    colorNombre: 'text-[#ffffff]',
    colorFooter: 'text-[#bae6fd]',
    badgeMediaClass: 'bg-gradient-to-br from-sky-400 to-indigo-950 text-white border border-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.5)]',
  }
}

/**
 * La carta del jugador (estilo FUT) con paleta dinámica según la media (Bronce, Plata, Oro, Especial o Ícono).
 * Presentacional y `forwardRef`: el `ref` apunta al nodo raíz para que `generarImagenCarta` lo rasterice.
 */
export const TarjetaJugador = forwardRef<HTMLDivElement, { datos: DatosTarjeta; className?: string }>(
  function TarjetaJugador({ datos, className }, ref) {
    const clipId = `ficha-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
    const esFoto = datos.fotoUrl?.startsWith('http')
    const tema = obtenerTemaSegunMedia(datos.media)

    return (
      <div
        ref={ref}
        className={`relative w-64 h-[24rem] shrink-0 transition-all ${tema.dropShadowClass} ${className ?? ''}`}
        style={{ clipPath: `url(#${clipId})` }}
      >
        {/* La silueta del polygon de siempre (15% 0 / 85% 0 / ... / 50% 100%)
            pero con cada vértice redondeado. Va en SVG con objectBoundingBox
            para que escale sola si cambia el tamaño de la ficha. */}
        <svg width="0" height="0" className="absolute" aria-hidden="true">
          <defs>
            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
              <path d="M .2047 0 L .7953 0 Q .85 0 .8887 .0258 L .9613 .0742 Q 1 .1 1 .1365 L 1 .8135 Q 1 .85 .95 .8648 L .55 .9852 Q .5 1 .45 .9852 L .05 .8648 Q 0 .85 0 .8135 L 0 .1365 Q 0 .1 .0387 .0742 L .1113 .0258 Q .15 0 .2047 0 Z" />
            </clipPath>
          </defs>
        </svg>
        <div className={`relative h-full w-full ${tema.fondoGradiente} flex flex-col p-4 ${tema.colorTexto} font-sans`}>
          {/* Background Texture/Shines */}
          <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-bl from-white/30 to-transparent pointer-events-none" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}></div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" style={{ clipPath: 'polygon(0 100%, 0 0, 100% 100%)' }}></div>

          {/* Top Left Stats & Position */}
          <div className="absolute top-6 left-5 flex flex-col items-center z-10">
            <div className="text-5xl font-black tracking-tighter leading-none" title="Media / OVR calculada de la temporada">{datos.media}</div>
            <div className="text-xl font-bold uppercase tracking-widest mt-1">{datos.pos}</div>
            <div className={`w-8 h-[2px] ${tema.colorLineaFuerte} mt-1 mb-1`}></div>
            <div className="w-8 h-6 flex items-center justify-center">
              <span className="text-2xl">🇦🇷</span>
            </div>
            {datos.shieldUrl && (
              <div className="mt-1 w-8 h-8 flex items-center justify-center text-xl bg-zinc-900/10 rounded-full overflow-hidden">
                <img src={datos.shieldUrl} alt={`Escudo de ${datos.equipoNombre}`} className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Player Image / Emoji */}
          <div className="mt-2 w-full h-40 flex items-end justify-center z-0">
            <div className={`w-32 h-32 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center border-4 ${tema.bordeFoto} drop-shadow-lg`}>
              {esFoto ? (
                <img src={datos.fotoUrl} alt={`Foto de ${datos.nombre}`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl">{datos.fotoUrl || '⚽'}</span>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="mt-1 w-full text-center z-10 flex flex-col items-center">
            <div className={`w-48 h-[1px] ${tema.colorLineaMedia} mb-1`}></div>
            <h2 className={`text-2xl font-black uppercase tracking-widest ${tema.colorNombre} truncate w-full px-2`}>{datos.nombre}</h2>
            <div className={`w-48 h-[1px] ${tema.colorLineaMedia} mt-1`}></div>
          </div>

          {/* Stats Grid */}
          <div className={`w-full mt-2 grid grid-cols-[1fr_auto_1fr] gap-x-2 ${tema.colorTexto} font-bold text-sm px-4 z-10`}>
            {/* Left Column */}
            <div className="flex flex-col gap-1 items-start pl-2">
              <div className="flex gap-2 justify-start items-center">
                <span className="uppercase w-8 text-left text-xs">EDAD</span>
                <span className="text-lg font-black leading-none w-8 text-right">{datos.edad}</span>
              </div>
              <div className="flex gap-2 justify-start items-center">
                <span className="uppercase w-8 text-left text-xs">GOL</span>
                <span className="text-lg font-black leading-none w-8 text-right">{datos.goles}</span>
              </div>
              <div className="flex gap-2 justify-start items-center">
                <span className="uppercase w-8 text-left text-xs">PAR</span>
                <span className="text-lg font-black leading-none w-8 text-right">{datos.partidos}</span>
              </div>
            </div>

            {/* Divider */}
            <div className={`w-[1px] ${tema.colorLineaSuave} h-full`}></div>

            {/* Right Column */}
            <div className="flex flex-col gap-1 items-start pl-2">
              <div className="flex gap-2 justify-start items-center">
                <span className="uppercase w-8 text-left text-xs">PIE</span>
                <span className="text-lg font-black leading-none w-8 text-right">{datos.pierna}</span>
              </div>
              <div className="flex gap-2 justify-start items-center">
                <span className="uppercase w-8 text-left text-xs">ASI</span>
                <span className="text-lg font-black leading-none w-8 text-right">{datos.asistencias}</span>
              </div>
              <div className="flex gap-2 justify-start items-center">
                <span className="uppercase w-8 text-left text-xs">POS</span>
                <span className="text-lg font-black leading-none w-8 text-right">{datos.pos}</span>
              </div>
            </div>
          </div>

          {/* Footer: el equipo del jugador o marca */}
          <div className={`mt-auto mb-16 pt-2 w-full flex flex-col items-center justify-center ${tema.colorFooter} opacity-80 z-10`}>
            <div className="text-[11px] font-black tracking-[0.2em] uppercase truncate w-full text-center">
              {datos.equipoNombre || 'Fulbeando'}
            </div>
          </div>
        </div>
      </div>
    )
  },
)
