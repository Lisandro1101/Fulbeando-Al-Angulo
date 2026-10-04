import type { ReactNode } from 'react'

/** Contenedor de pantalla: fondo "Asfalto", Safe Area y scroll. */
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
    <div className="flex flex-1 flex-col overflow-hidden bg-canvas">
      <header className="sticky top-0 z-20 border-b border-ink-faint/20 bg-canvas/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex w-full items-center justify-between gap-3">
          <div>
            {titulo && <h1 className="text-lg font-bold text-ink">{titulo}</h1>}
            {subtitulo && <p className="text-sm text-ink-muted">{subtitulo}</p>}
          </div>
          {acciones}
        </div>
      </header>
      <main className="mx-auto w-full flex-1 overflow-y-auto px-4 py-4 pb-safe">{children}</main>
    </div>
  )
}

/** Superficie estandar del PRD: Slate Card. */
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
    <section className="surface">
      <div className="flex items-start justify-between gap-3">
        <div>
          {titulo && <h2 className="text-base font-semibold text-ink">{titulo}</h2>}
          {descripcion && <p className="mt-1 text-sm text-ink-muted">{descripcion}</p>}
        </div>
        {acciones}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </section>
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
    pitch: 'bg-pitch-faint/60 text-pitch',
    urgent: 'bg-urgent-faint/60 text-urgent',
    occupied: 'bg-occupied-faint/60 text-occupied',
    mute: 'bg-ink-faint/20 text-ink-muted',
  } as const
  return <span className={`badge ${tonos[tono]}`}>{children}</span>
}
