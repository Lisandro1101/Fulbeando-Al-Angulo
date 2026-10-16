import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { X } from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Toast unico (aria-live). Reemplaza los toasts duplicados por pantalla. */
/* ------------------------------------------------------------------ */

export type ToastTipo = 'exito' | 'error' | 'info'

const TONOS_TOAST: Record<ToastTipo, string> = {
  exito: 'bg-emerald-500 text-zinc-950',
  error: 'bg-red-500 text-white',
  info: 'bg-zinc-800 text-white border border-zinc-700',
}

export function Toast({ mensaje, tipo = 'exito' }: { mensaje: string | null; tipo?: ToastTipo }) {
  if (!mensaje) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-6 left-1/2 z-[400] max-w-[90vw] -translate-x-1/2 whitespace-pre-line rounded-2xl px-6 py-3 text-center text-sm font-black shadow-2xl animate-bounce ${TONOS_TOAST[tipo]}`}
    >
      {mensaje}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modal unico con role=dialog / aria-modal y cierre accesible.        */
/* ------------------------------------------------------------------ */

export function Modal({
  abierto,
  etiqueta,
  onCerrar,
  rol = 'dialog',
  children,
  className = '',
}: {
  abierto: boolean
  etiqueta: string
  onCerrar?: () => void
  rol?: 'dialog' | 'alertdialog'
  children: ReactNode
  className?: string
}) {
  if (!abierto) return null
  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onCerrar}
    >
      <div
        role={rol}
        aria-modal="true"
        aria-label={etiqueta}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-slide-up ${className}`}
      >
        {onCerrar && (
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="absolute right-5 top-5 text-zinc-500 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Skeleton para estados de carga.                                     */
/* ------------------------------------------------------------------ */

export function Esqueleto({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-zinc-800/70 ${className}`} />
}

/* ------------------------------------------------------------------ */
/* Loading de marca: wordmark FULBEANDO + radar latiendo.             */
/* ------------------------------------------------------------------ */

export function CargandoFulbeando({
  visible = true,
  mensaje,
}: {
  visible?: boolean
  mensaje?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={visible}
      aria-hidden={!visible}
      className={`fixed inset-0 z-[399] flex flex-col items-center justify-center gap-4 bg-[#0B0F19] text-white transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <h1 className="text-4xl font-black italic tracking-tighter text-white">FULBEANDO</h1>
      <span className="h-10 w-10 animate-radar-pulse rounded-full bg-pitch" />
      {mensaje && <p className="text-sm text-zinc-400 font-medium">{mensaje}</p>}
      <span className="sr-only">Cargando…</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Transicion de pantalla: loading de marca solo en procesos grandes.  */
/* ------------------------------------------------------------------ */

/** Cuanto se mantiene el loading en cada transicion grande (ms). */
const MS_TRANSICION = 500

/**
 * Rutas de los flujos "grandes" (acceso y setup). El overlay solo aparece al
 * entrar o salir de alguna de estas; navegar entre pestanias de la barra
 * inferior no lo dispara, para no cortar el uso normal de la app.
 */
const RUTAS_PESADAS = new Set([
  '/login',
  '/role-selector',
  '/onboarding-player',
  '/plan-pendiente',
  '/venue-registration',
  '/venue-subscription',
  '/superadmin',
])

export function ProveedorTransicion({ children }: { children: ReactNode }) {
  const location = useLocation()
  const anterior = useRef(location.pathname)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const destino = location.pathname
    if (destino === anterior.current) return
    const origen = anterior.current
    anterior.current = destino
    // Solo transiciones hacia/desde un flujo grande.
    if (!RUTAS_PESADAS.has(origen) && !RUTAS_PESADAS.has(destino)) return
    setVisible(true)
    const temporizador = window.setTimeout(() => setVisible(false), MS_TRANSICION)
    return () => window.clearTimeout(temporizador)
  }, [location.pathname])

  return (
    <>
      {children}
      <CargandoFulbeando visible={visible} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Confirmacion unica (reemplaza window.confirm / alert).             */
/* ------------------------------------------------------------------ */

export interface ConfirmOpciones {
  titulo?: string
  textoConfirmar?: string
  textoCancelar?: string
  peligro?: boolean
}

type ConfirmarFn = (mensaje: string, opciones?: ConfirmOpciones) => Promise<boolean>

const ConfirmContext = createContext<ConfirmarFn | null>(null)

/** Devuelve una funcion que abre el modal y resuelve `true`/`false`. */
export function useConfirmar(): ConfirmarFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirmar requiere envolver la app con <ProveedorConfirm>')
  return ctx
}

export function ProveedorConfirm({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<{
    mensaje: string
    opciones: ConfirmOpciones
    resolver: (valor: boolean) => void
  } | null>(null)

  const confirmar = useCallback<ConfirmarFn>(
    (mensaje, opciones = {}) =>
      new Promise<boolean>((resolver) => setEstado({ mensaje, opciones, resolver })),
    [],
  )

  const responder = (valor: boolean) => {
    setEstado((actual) => {
      actual?.resolver(valor)
      return null
    })
  }

  const opciones = estado?.opciones ?? {}

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      <Modal
        abierto={estado !== null}
        etiqueta={opciones.titulo ?? 'Confirmación'}
        rol="alertdialog"
      >
        <h2 className="pr-8 text-lg font-black text-white">{opciones.titulo ?? 'Confirmar'}</h2>
        <p className="mt-2 text-sm text-zinc-400">{estado?.mensaje}</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => responder(false)}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-zinc-700"
          >
            {opciones.textoCancelar ?? 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={() => responder(true)}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-black text-zinc-950 transition ${
              opciones.peligro ? 'bg-red-500 hover:bg-red-400' : 'bg-emerald-500 hover:bg-emerald-400'
            }`}
          >
            {opciones.textoConfirmar ?? 'Confirmar'}
          </button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}
