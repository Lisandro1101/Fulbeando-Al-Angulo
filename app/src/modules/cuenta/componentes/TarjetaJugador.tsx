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

/**
 * La carta dorada del jugador (estilo FUT). Presentacional y `forwardRef`: el
 * `ref` apunta al nodo raiz para que `generarImagenCarta` lo rasterice.
 *
 * El `clipPath` define la silueta de la ficha en SVG (no `clip-path: path()`
 * porque Safari no lo soporta). El id se genera unico por instancia porque
 * `useId` trae caracteres que rompen el `url(#...)`, asi que se limpian.
 */
export const TarjetaJugador = forwardRef<HTMLDivElement, { datos: DatosTarjeta; className?: string }>(
  function TarjetaJugador({ datos, className }, ref) {
    const clipId = `ficha-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
    const esFoto = datos.fotoUrl?.startsWith('http')

    return (
      <div
        ref={ref}
        className={`relative w-64 h-[24rem] shrink-0 drop-shadow-[0_15px_25px_rgba(245,158,11,0.4)] ${className ?? ''}`}
        style={{ clipPath: `url(#${clipId})` }}
      >
        {/* La silueta del polygon de siempre (15% 0 / 85% 0 / ... / 50% 100%)
            pero con cada vertice redondeado. Va en SVG con objectBoundingBox
            para que escale sola si cambia el tamano de la ficha. */}
        <svg width="0" height="0" className="absolute" aria-hidden="true">
          <defs>
            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
              <path d="M .2047 0 L .7953 0 Q .85 0 .8887 .0258 L .9613 .0742 Q 1 .1 1 .1365 L 1 .8135 Q 1 .85 .95 .8648 L .55 .9852 Q .5 1 .45 .9852 L .05 .8648 Q 0 .85 0 .8135 L 0 .1365 Q 0 .1 .0387 .0742 L .1113 .0258 Q .15 0 .2047 0 Z" />
            </clipPath>
          </defs>
        </svg>
        <div className="relative h-full w-full bg-gradient-to-br from-[#f9d976] via-[#e6b741] to-[#b38020] flex flex-col p-4 text-[#2c2005] font-sans">
          {/* Background Texture/Shines */}
          <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-bl from-white/30 to-transparent pointer-events-none" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}></div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" style={{ clipPath: 'polygon(0 100%, 0 0, 100% 100%)' }}></div>

          {/* Top Left Stats & Position */}
          <div className="absolute top-6 left-5 flex flex-col items-center z-10">
            <div className="text-5xl font-black tracking-tighter leading-none" title="Media / OVR calculada de la temporada">{datos.media}</div>
            <div className="text-xl font-bold uppercase tracking-widest mt-1">{datos.pos}</div>
            <div className="w-8 h-[2px] bg-[#5c4a1e] mt-1 mb-1"></div>
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
            <div className="w-32 h-32 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center border-4 border-[#e6b741] drop-shadow-lg">
              {esFoto ? (
                <img src={datos.fotoUrl} alt={`Foto de ${datos.nombre}`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl">{datos.fotoUrl || '⚽'}</span>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="mt-1 w-full text-center z-10 flex flex-col items-center">
            <div className="w-48 h-[1px] bg-[#7a6427]/60 mb-1"></div>
            <h2 className="text-2xl font-black uppercase tracking-widest text-[#1a1303] truncate w-full px-2">{datos.nombre}</h2>
            <div className="w-48 h-[1px] bg-[#7a6427]/60 mt-1"></div>
          </div>

          {/* Stats Grid */}
          <div className="w-full mt-2 grid grid-cols-[1fr_auto_1fr] gap-x-2 text-[#2c2005] font-bold text-sm px-4 z-10">
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
            <div className="w-[1px] bg-[#7a6427]/40 h-full"></div>

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

          {/* Footer: el equipo del jugador; sin equipo, la marca. Con mb-16
              sube fuera de la punta de la ficha: abajo del todo el clip lo comia. */}
          <div className="mt-auto mb-16 pt-2 w-full flex flex-col items-center justify-center opacity-80 z-10">
            <div className="text-[11px] font-black tracking-[0.2em] uppercase truncate w-full text-center">
              {datos.equipoNombre || 'Fulbeando'}
            </div>
          </div>
        </div>
      </div>
    )
  },
)
