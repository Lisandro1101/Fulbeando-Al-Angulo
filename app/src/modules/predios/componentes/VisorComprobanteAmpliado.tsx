import { useEffect, useState, useRef, useCallback } from 'react'
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  ExternalLink,
  Download,
  Move,
  Maximize2,
} from 'lucide-react'

export interface VisorComprobanteAmpliadoProps {
  abierto: boolean
  onCerrar: () => void
  url: string
  titulo?: string
  subtitulo?: string
}

export function VisorComprobanteAmpliado({
  abierto,
  onCerrar,
  url,
  titulo = 'Comprobante de transferencia',
  subtitulo,
}: VisorComprobanteAmpliadoProps) {
  const [zoom, setZoom] = useState<number>(1)
  const [rotacion, setRotacion] = useState<number>(0)
  const [posicion, setPosicion] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [arrastrando, setArrastrando] = useState<boolean>(false)
  const [inicioArrastre, setInicioArrastre] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [distanciaPinchInicial, setDistanciaPinchInicial] = useState<number | null>(null)

  const contenedorRef = useRef<HTMLDivElement>(null)

  // Resetear transformaciones cada vez que se abre con una nueva imagen
  useEffect(() => {
    if (abierto) {
      setZoom(1)
      setRotacion(0)
      setPosicion({ x: 0, y: 0 })
    }
  }, [abierto, url])

  // Controles de zoom
  const aplicarZoom = useCallback((nuevoZoom: number) => {
    const zoomLimitado = Math.min(Math.max(Number(nuevoZoom.toFixed(2)), 0.75), 4)
    setZoom(zoomLimitado)
    if (zoomLimitado === 1) {
      setPosicion({ x: 0, y: 0 })
    }
  }, [])

  const zoomIn = useCallback(() => aplicarZoom(zoom + 0.35), [zoom, aplicarZoom])
  const zoomOut = useCallback(() => aplicarZoom(zoom - 0.35), [zoom, aplicarZoom])

  // Control de rotación cíclica (0 -> 90 -> 180 -> 270 -> 0)
  const rotar = useCallback(() => {
    setRotacion((prev) => (prev + 90) % 360)
  }, [])

  // Restablecer vista inicial
  const restablecer = useCallback(() => {
    setZoom(1)
    setRotacion(0)
    setPosicion({ x: 0, y: 0 })
  }, [])

  // Doble clic para alternar entre 1x y 2x
  const toggleDobleClic = useCallback(() => {
    if (zoom > 1.2) {
      restablecer()
    } else {
      aplicarZoom(2.2)
    }
  }, [zoom, restablecer, aplicarZoom])

  // Atajos de teclado
  useEffect(() => {
    if (!abierto) return

    const manejarTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCerrar()
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        zoomIn()
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        zoomOut()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        rotar()
      } else if (e.key === '0') {
        e.preventDefault()
        restablecer()
      }
    }

    window.addEventListener('keydown', manejarTeclado)
    return () => window.removeEventListener('keydown', manejarTeclado)
  }, [abierto, onCerrar, zoomIn, zoomOut, rotar, restablecer])

  // Manejo de rueda del mouse (wheel)
  const manejarRueda = (e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 0.2 : -0.2
    aplicarZoom(zoom + factor)
  }

  // Eventos de arrastre con Mouse
  const iniciarArrastreMouse = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Solo clic izquierdo
    setArrastrando(true)
    setInicioArrastre({
      x: e.clientX - posicion.x,
      y: e.clientY - posicion.y,
    })
  }

  const moverMouse = (e: React.MouseEvent) => {
    if (!arrastrando) return
    setPosicion({
      x: e.clientX - inicioArrastre.x,
      y: e.clientY - inicioArrastre.y,
    })
  }

  const finalizarArrastreMouse = () => {
    setArrastrando(false)
  }

  // Eventos táctiles para móviles (soporte Pan y Pinch-to-zoom)
  const iniciarToque = (e: React.TouchEvent) => {
    const t0 = e.touches[0]
    const t1 = e.touches[1]
    if (e.touches.length === 1 && t0) {
      setArrastrando(true)
      setInicioArrastre({
        x: t0.clientX - posicion.x,
        y: t0.clientY - posicion.y,
      })
      setDistanciaPinchInicial(null)
    } else if (e.touches.length === 2 && t0 && t1) {
      // Calcular distancia inicial de pellizco
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY)
      setDistanciaPinchInicial(dist)
    }
  }

  const moverToque = (e: React.TouchEvent) => {
    const t0 = e.touches[0]
    const t1 = e.touches[1]
    if (e.touches.length === 1 && arrastrando && t0) {
      setPosicion({
        x: t0.clientX - inicioArrastre.x,
        y: t0.clientY - inicioArrastre.y,
      })
    } else if (e.touches.length === 2 && distanciaPinchInicial !== null && t0 && t1) {
      const distActual = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY)
      const ratio = distActual / distanciaPinchInicial
      aplicarZoom(zoom * ratio)
      setDistanciaPinchInicial(distActual)
    }
  }

  const finalizarToque = () => {
    setArrastrando(false)
    setDistanciaPinchInicial(null)
  }

  // Forzar descarga de la imagen
  const descargar = () => {
    const link = document.createElement('a')
    link.href = url
    link.download = `comprobante-${Date.now()}.jpg`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!abierto) return null

  const porcentajeZoom = Math.round(zoom * 100)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visor de comprobante ampliado"
      className="fixed inset-0 z-[500] flex flex-col bg-canvas/95 backdrop-blur-xl select-none animate-in fade-in duration-200"
    >
      {/* 1. Barra superior de navegación y metadatos */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-zinc-900/80 border-b border-zinc-800/80 z-20 shrink-0">
        <div className="min-w-0 pr-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-pitch animate-pulse" />
            <h2 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
              {titulo}
            </h2>
          </div>
          {subtitulo ? (
            <p className="text-xs text-zinc-400 font-medium truncate mt-0.5">{subtitulo}</p>
          ) : (
            <p className="text-xs text-zinc-500 font-medium hidden sm:block mt-0.5">
              Arrastrá para mover · Rueda para zoom · Doble clic para 2x
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={descargar}
            title="Descargar imagen"
            aria-label="Descargar imagen"
            className="p-2.5 rounded-full text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 transition cursor-pointer"
          >
            <Download className="h-4 w-4" />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            title="Abrir original en pestaña nueva"
            aria-label="Abrir original en pestaña nueva"
            className="p-2.5 rounded-full text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 transition cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={onCerrar}
            title="Cerrar visor (Esc)"
            aria-label="Cerrar visor"
            className="p-2.5 rounded-full text-zinc-400 hover:text-white bg-zinc-800 hover:bg-rose-950/80 hover:border-rose-500/50 border border-zinc-700/80 transition cursor-pointer ml-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 2. Área central del visor de imagen interactiva */}
      <main
        ref={contenedorRef}
        onWheel={manejarRueda}
        onMouseDown={iniciarArrastreMouse}
        onMouseMove={moverMouse}
        onMouseUp={finalizarArrastreMouse}
        onMouseLeave={finalizarArrastreMouse}
        onTouchStart={iniciarToque}
        onTouchMove={moverToque}
        onTouchEnd={finalizarToque}
        onDoubleClick={toggleDobleClic}
        className={`relative flex-1 overflow-hidden flex items-center justify-center p-4 ${
          arrastrando ? 'cursor-grabbing' : zoom > 1 ? 'cursor-grab' : 'cursor-default'
        }`}
      >
        <div
          style={{
            transform: `translate(${posicion.x}px, ${posicion.y}px) scale(${zoom}) rotate(${rotacion}deg)`,
            transition: arrastrando ? 'none' : 'transform 0.15s ease-out',
          }}
          className="relative max-h-full max-w-full flex items-center justify-center pointer-events-none will-change-transform"
        >
          <img
            src={url}
            alt="Comprobante ampliado"
            draggable={false}
            className="max-h-[75vh] max-w-[85vw] object-contain rounded-xl shadow-2xl border border-zinc-800/50 bg-black/40"
          />
        </div>

        {/* Indicador flotante sutil cuando hay paneo activo */}
        {zoom > 1 && (
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-700/60 backdrop-blur-md text-[11px] font-bold text-zinc-300 pointer-events-none shadow-lg">
            <Move className="h-3 w-3 text-emerald-400" />
            <span>Arrastrá para encuadrar</span>
          </div>
        )}
      </main>

      {/* 3. Barra de herramientas flotante inferior */}
      <footer className="p-4 sm:p-6 flex justify-center z-20 shrink-0 pointer-events-none">
        <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-zinc-900/90 border border-zinc-700/80 backdrop-blur-xl shadow-2xl pointer-events-auto">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= 0.75}
            title="Reducir zoom (-)"
            aria-label="Reducir zoom"
            className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-90 transition disabled:opacity-30 cursor-pointer"
          >
            <ZoomOut className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Porcentaje de zoom (clic para 100%) */}
          <button
            type="button"
            onClick={restablecer}
            title="Restablecer a 100% (0)"
            className="px-2.5 py-1 rounded-full text-xs font-mono font-black text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer"
          >
            {porcentajeZoom}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= 4}
            title="Aumentar zoom (+)"
            aria-label="Aumentar zoom"
            className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-90 transition disabled:opacity-30 cursor-pointer"
          >
            <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Separador */}
          <div className="h-5 w-px bg-zinc-700/80 mx-1" />

          {/* Rotar 90° */}
          <button
            type="button"
            onClick={rotar}
            title={`Rotar 90° (R) — Actual: ${rotacion}°`}
            aria-label="Rotar comprobante"
            className="flex items-center gap-1.5 p-2 px-2.5 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-90 transition cursor-pointer"
          >
            <RotateCw className="h-4 w-4 sm:h-5 sm:w-5" />
            {rotacion > 0 && (
              <span className="text-[10px] font-mono font-bold text-amber-400">{rotacion}°</span>
            )}
          </button>

          {/* Restablecer todo */}
          {(zoom !== 1 || rotacion !== 0 || posicion.x !== 0 || posicion.y !== 0) && (
            <button
              type="button"
              onClick={restablecer}
              title="Restablecer escala, rotación y posición"
              aria-label="Restablecer vista"
              className="p-2 rounded-full text-amber-400 hover:bg-amber-400/10 active:scale-90 transition cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}

          {/* Doble zoom rápido */}
          <button
            type="button"
            onClick={toggleDobleClic}
            title="Alternar vista ampliada"
            aria-label="Alternar vista ampliada"
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-90 transition cursor-pointer hidden sm:block"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  )
}
