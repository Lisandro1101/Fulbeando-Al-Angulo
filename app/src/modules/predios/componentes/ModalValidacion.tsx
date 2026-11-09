import { useEffect, useState } from 'react'
import { AlertTriangle, Check, ExternalLink, FileText, Loader2, X, ZoomIn } from 'lucide-react'
import type { Comprobante, Turno } from '@/domain'
import { aFechaISO, formatearFechaCorta, formatearMoneda } from '@/core/tiempo'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer'
import { obtenerComprobante, obtenerUrlComprobante } from '@/modules/comprobantes/repositorio'
import { VisorComprobanteAmpliado } from './VisorComprobanteAmpliado'

/**
 * Modal de validacion rapida (PRD 4.4): previsualizacion del comprobante +
 * "Aprobar turno?" / "Rechazar". El rechazo pide motivo: el PRD lo define
 * como campo opcional pero se usa para que el organizador sepa que corregir.
 */
export function ModalValidacion({
  turno,
  onAprobar,
  onRechazar,
  onCerrar,
}: {
  turno: Turno
  onAprobar: (turno: Turno) => Promise<void>
  onRechazar: (turno: Turno, motivo: string) => Promise<void>
  onCerrar: () => void
}) {
  const [comprobante, setComprobante] = useState<Comprobante | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errorComprobante, setErrorComprobante] = useState<string | null>(null)
  const [errorImagen, setErrorImagen] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [visorAmpliadoAbierto, setVisorAmpliadoAbierto] = useState(false)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setErrorComprobante(null)
    setErrorImagen(null)

    obtenerComprobante(turno.id)
      .then(async (c) => {
        if (!vigente) return
        setComprobante(c)
        if (c === null) {
          setErrorComprobante('No encontramos el registro del comprobante de esta solicitud.')
          return
        }
        try {
          const link = await obtenerUrlComprobante(c.storagePath)
          if (vigente) setUrl(link)
        } catch (err: unknown) {
          const errCode = (err as { code?: string })?.code
          console.warn('[ModalValidacion] No se pudo obtener la URL del comprobante:', err)
          if (vigente) {
            if (errCode === 'storage/object-not-found') {
              setErrorImagen('La imagen física no se encuentra en el almacenamiento (típico en turnos de prueba o si se borró el archivo).')
            } else if (errCode === 'storage/unauthorized') {
              setErrorImagen('Sin permisos de Storage para ver la imagen de este comprobante.')
            } else {
              setErrorImagen('No pudimos abrir la imagen del comprobante.')
            }
          }
        }
      })
      .catch((err) => {
        console.error('[ModalValidacion] Error al obtener comprobante:', err)
        if (vigente) setErrorComprobante('No pudimos cargar los datos del comprobante.')
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [turno.id])

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !ocupado) onCerrar()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar, ocupado])

  const aprobar = async () => {
    setOcupado(true)
    setErrorAccion(null)
    try {
      await onAprobar(turno)
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : 'No pudimos aprobar el turno.')
      setOcupado(false)
    }
  }

  const rechazar = async () => {
    if (motivo.trim().length === 0) {
      setPidiendoMotivo(true)
      return
    }
    setOcupado(true)
    setErrorAccion(null)
    try {
      await onRechazar(turno, motivo.trim())
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : 'No pudimos rechazar el turno.')
      setOcupado(false)
    }
  }

  const venceHoy = turno.fecha === aFechaISO()

  return (
    <Drawer open={true} onOpenChange={(open) => !open && !ocupado && onCerrar()}>
      <DrawerContent className="p-0 max-h-[92vh] md:max-w-lg md:mx-auto flex flex-col overflow-hidden bg-zinc-900 border-t border-zinc-800 text-zinc-100 shadow-2xl">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Validar solicitud de turno</DrawerTitle>
          <DrawerDescription>
            {venceHoy ? 'Hoy' : formatearFechaCorta(turno.fecha)} · {turno.horaInicio} a {turno.horaFin}
          </DrawerDescription>
        </DrawerHeader>

        {/* Encabezado fijo */}
        <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-3 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Validar solicitud</h2>
            <p className="text-xs text-zinc-400 font-medium">
              {venceHoy ? 'Hoy' : formatearFechaCorta(turno.fecha)} · {turno.horaInicio} a{' '}
              {turno.horaFin}
            </p>
          </div>
          <DrawerClose asChild>
            <button
              type="button"
              onClick={onCerrar}
              disabled={ocupado}
              aria-label="Cerrar"
              className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-700/60 transition cursor-pointer disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </DrawerClose>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0 space-y-4">
          <dl className="space-y-2 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 p-3.5 text-sm">
            <Fila
              etiqueta="Organizador"
              valor={turno.organizadorNombre ?? 'Sin nombre'}
              secundario={turno.organizadorTelefono ?? undefined}
            />
            <Fila etiqueta="Alias de pago" valor={comprobante?.alias ?? turno.montoSena.toString()} />
            <Fila etiqueta="Seña esperada" valor={formatearMoneda(turno.montoSena)} />
            <Fila
              etiqueta="Monto declarado"
              valor={comprobante ? formatearMoneda(comprobante.monto) : 'sin comprobante'}
            />
          </dl>

          {turno.montoSena !== comprobante?.monto && comprobante !== null && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-300 font-medium">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              El monto del comprobante no coincide con la seña requerida.
            </p>
          )}

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">
              Comprobante de transferencia
            </p>
            {cargando ? (
              <div className="grid h-40 place-items-center rounded-2xl bg-canvas border border-zinc-800">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              </div>
            ) : url ? (
              (comprobante?.mimeType === 'application/pdf' || comprobante?.storagePath?.toLowerCase().endsWith('.pdf')) ? (
                <div className="overflow-hidden rounded-2xl bg-canvas border border-zinc-800">
                  <div className="p-5 text-center bg-zinc-900/70 border-b border-zinc-800 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2.5 shadow-sm">
                      <FileText className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-black text-white">Comprobante en formato PDF</p>
                    <p className="text-xs text-zinc-400 font-medium mt-0.5">Transferencia bancaria / billetera virtual</p>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 text-xs font-black text-pitch hover:text-pitch-muted bg-zinc-900 hover:bg-zinc-800 transition cursor-pointer border-t border-zinc-800"
                  >
                    <ExternalLink className="h-4 w-4" /> Abrir y revisar PDF en nueva pestaña
                  </a>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setVisorAmpliadoAbierto(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setVisorAmpliadoAbierto(true)
                    }
                  }}
                  className="block overflow-hidden rounded-2xl bg-canvas border border-zinc-800 hover:border-pitch/60 transition group shadow-md cursor-zoom-in"
                  title="Tocar para ampliar con zoom y rotación"
                >
                  <img
                    src={url}
                    alt="Comprobante de transferencia"
                    className="max-h-48 sm:max-h-56 w-full object-contain bg-canvas py-1"
                  />
                  <div className="flex items-center justify-between px-3 py-2 text-xs font-bold text-zinc-300 bg-zinc-900 border-t border-zinc-800 transition">
                    <span className="flex items-center gap-1.5 text-pitch group-hover:text-pitch-muted">
                      <ZoomIn className="h-3.5 w-3.5 text-pitch" /> Tocar para ampliar con zoom y rotación
                    </span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-zinc-400 hover:text-white px-2 py-0.5 rounded-lg hover:bg-zinc-800 transition text-[11px]"
                      title="Abrir en pestaña nueva"
                    >
                      <ExternalLink className="h-3 w-3" /> Pestaña nueva
                    </a>
                  </div>
                </div>
              )
            ) : errorImagen ? (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-center text-sm text-amber-300">
                <AlertTriangle className="mx-auto h-5 w-5 text-amber-400 mb-1" />
                <p className="font-bold">{errorImagen}</p>
                <p className="text-xs text-amber-400/80 mt-1">
                  Podés verificar los datos declarados en la tabla de arriba para decidir si aprobar o rechazar el turno.
                </p>
              </div>
            ) : (
              <p className="rounded-2xl bg-canvas border border-zinc-800 px-3 py-6 text-center text-sm text-zinc-400 font-semibold">
                {errorComprobante ?? 'Sin comprobante adjunto.'}
              </p>
            )}
          </div>

          {pidiendoMotivo && (
            <div>
              <label htmlFor="motivo-rechazo" className="mb-1 block text-xs font-bold text-zinc-300">
                Motivo del rechazo
              </label>
              <textarea
                id="motivo-rechazo"
                className="w-full rounded-2xl border border-zinc-700 bg-canvas p-3 text-sm text-white placeholder:text-zinc-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition min-h-20"
                placeholder="Ej: el alias no coincide con el del predio"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          )}

          {errorAccion && !pidiendoMotivo && (
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl font-semibold">
              {errorAccion}
            </p>
          )}
        </div>

        {/* Botones de acción fijados en el pie */}
        <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-900/98 shrink-0 flex gap-2.5">
          <button
            type="button"
            className="flex-1 py-3 px-4 rounded-xl font-bold bg-zinc-800 hover:bg-rose-950/80 text-rose-400 hover:text-rose-300 border border-zinc-700/80 hover:border-rose-500/50 flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer text-sm"
            onClick={rechazar}
            disabled={ocupado}
          >
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            <span>Rechazar</span>
          </button>
          <button
            type="button"
            className="flex-1 py-3 px-4 rounded-xl font-black bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer text-sm disabled:opacity-40"
            onClick={aprobar}
            disabled={ocupado || comprobante === null}
          >
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            <span>Aprobar turno</span>
          </button>
        </div>
      </DrawerContent>

      {url && (
        <VisorComprobanteAmpliado
          abierto={visorAmpliadoAbierto}
          onCerrar={() => setVisorAmpliadoAbierto(false)}
          url={url}
          titulo={`Comprobante · ${turno.organizadorNombre ?? 'Turno'}`}
          subtitulo={`${venceHoy ? 'Hoy' : formatearFechaCorta(turno.fecha)} ${turno.horaInicio} a ${turno.horaFin} · Seña: ${formatearMoneda(turno.montoSena)}`}
        />
      )}
    </Drawer>
  )
}

function Fila({
  etiqueta,
  valor,
  secundario,
}: {
  etiqueta: string
  valor: string
  secundario?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-zinc-400 font-semibold">{etiqueta}</dt>
      <dd className="text-right font-black text-white">
        {valor}
        {secundario && <span className="block text-xs font-medium text-zinc-400">{secundario}</span>}
      </dd>
    </div>
  )
}
