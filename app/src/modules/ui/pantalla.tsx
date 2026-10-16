import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

/** Contenedor de pantalla: cabecera morada deportiva #361982, transiciones framer-motion y lienzo claro. */
export function Pantalla({
  titulo,
  subtitulo,
  acciones,
  children,
}: {
  titulo?: string
  subtitulo?: string
  acciones?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex flex-1 min-h-0 w-full flex-col overflow-hidden bg-[#1E0D4A]">
      {/* Panel de arriba: Morado deportivo #361982 con degradé dinámico a pantalla completa */}
      <header className="sticky top-0 z-20 border-b border-[#4C24B2]/40 bg-gradient-to-r from-[#361982] via-[#2A1367] to-[#361982] px-4 md:px-8 py-4 backdrop-blur-md shadow-lg">
        <div className="flex w-full items-center justify-between gap-3">
          <div>
            {titulo && <h1 className="text-lg md:text-xl font-black text-white tracking-wide">{titulo}</h1>}
            {subtitulo && <p className="text-sm text-indigo-200/90 font-medium">{subtitulo}</p>}
          </div>
          {acciones && <div className="flex items-center gap-2 shrink-0">{acciones}</div>}
        </div>
      </header>

      {/* Recuadro de contenido: Lienzo claro deportivo de alto contraste que ocupa el 100% del ancho disponible */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0]/70 text-slate-800">
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full px-4 md:px-8 py-5 pb-28 md:pb-12 space-y-5"
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}

/** Superficie deportiva Clean Pro Tech con framer-motion, borde sutil y relieve */
export function Tarjeta({
  titulo,
  descripcion,
  acciones,
  children,
}: {
  titulo?: string
  descripcion?: string
  acciones?: ReactNode
  children?: ReactNode
}) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 26 }}
      className="w-full rounded-2xl bg-gradient-to-b from-white via-white/98 to-[#F8FAFC] p-4 sm:p-6 border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(54,25,130,0.06),0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-6px_rgba(54,25,130,0.12)] text-slate-800 transition-shadow relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {titulo && <h2 className="text-base font-extrabold text-slate-900 tracking-tight">{titulo}</h2>}
          {descripcion && <p className="mt-1 text-sm text-slate-500 font-medium">{descripcion}</p>}
        </div>
        {acciones}
      </div>
      {children && <div className="mt-3.5">{children}</div>}
    </motion.section>
  )
}

export function Etiqueta({
  tono,
  children,
}: {
  tono: 'pitch' | 'urgent' | 'occupied' | 'mute'
  children: ReactNode
}) {
  const tonos = {
    pitch: 'bg-gradient-to-r from-emerald-50 to-green-100 text-emerald-800 border border-emerald-300/80 shadow-sm',
    urgent: 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border border-amber-300/80 shadow-sm',
    occupied: 'bg-gradient-to-r from-rose-50 to-rose-100 text-rose-800 border border-rose-300/80 shadow-sm',
    mute: 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600 border border-slate-300/80',
  } as const
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${tonos[tono]}`}>{children}</span>
}
