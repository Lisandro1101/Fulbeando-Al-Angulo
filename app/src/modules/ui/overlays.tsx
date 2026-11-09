import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
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
      className={`fixed top-6 left-1/2 z-[400] max-w-[90vw] -translate-x-1/2 whitespace-pre-line rounded-2xl px-6 py-3 text-center text-sm font-black shadow-2xl animate-slide-up ${TONOS_TOAST[tipo]}`}
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
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
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

import { Skeleton } from '@/components/ui/skeleton'

export const Esqueleto = Skeleton

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
      className={`fixed inset-0 z-[399] flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#25105a] via-[#1c0a48] to-[#140636] text-white transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <h1 className="text-4xl font-black italic tracking-tighter text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)]">FULBEANDO</h1>
      <span className="h-10 w-10 animate-radar-pulse rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)]" />
      {mensaje && <p className="text-sm text-indigo-200/80 font-medium">{mensaje}</p>}
      <span className="sr-only">Cargando…</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Transicion de pantalla: contenedor sin overlay artificial           */
/* ------------------------------------------------------------------ */

export function ProveedorTransicion({ children }: { children: ReactNode }) {
  return <>{children}</>
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

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

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
      <AlertDialog open={estado !== null} onOpenChange={(open) => !open && responder(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{opciones.titulo ?? '¿Estás seguro?'}</AlertDialogTitle>
            <AlertDialogDescription>{estado?.mensaje}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => responder(false)}>
              {opciones.textoCancelar ?? 'Cancelar'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => responder(true)}
              className={opciones.peligro ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black'}
            >
              {opciones.textoConfirmar ?? 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}
