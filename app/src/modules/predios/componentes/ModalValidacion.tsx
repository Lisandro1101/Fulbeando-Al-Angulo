import { useEffect, useState } from 'react'
import { AlertTriangle, Check, ExternalLink, FileText, Loader2, X } from 'lucide-react'
import type { Comprobante, Turno } from '@/domain'
import { aFechaISO, formatearFechaCorta, formatearMoneda } from '@/core/tiempo'
import { obtenerComprobante, obtenerUrlComprobante } from '@/modules/comprobantes/repositorio'

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
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 backdrop-blur-sm p-0 sm:items-center sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Validar solicitud de turno"
      onClick={(e) => {
        if (e.target === e.currentTarget && !ocupado) onCerrar()
      }}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white border border-slate-200 p-5 sm:p-8 shadow-2xl text-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Validar solicitud</h2>
            <p className="text-sm text-slate-600 font-semibold">
              {venceHoy ? 'Hoy' : formatearFechaCorta(turno.fecha)} · {turno.horaInicio} a{' '}
              {turno.horaFin}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={ocupado}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950 border border-slate-300 transition cursor-pointer disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <dl className="mt-4 space-y-2 rounded-xl bg-slate-100/80 border border-slate-300 p-3.5 text-sm">
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
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 font-medium">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            El monto del comprobante no coincide con la seña requerida.
          </p>
        )}

        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">
            Comprobante de transferencia
          </p>
          {cargando ? (
            <div className="grid h-48 place-items-center rounded-xl bg-slate-50 border border-slate-200">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : url ? (
            (comprobante?.mimeType === 'application/pdf' || comprobante?.storagePath?.toLowerCase().endsWith('.pdf')) ? (
              <div className="overflow-hidden rounded-xl bg-slate-50 border border-slate-200">
                <div className="p-6 text-center bg-slate-100/70 border-b border-slate-200 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mb-3 shadow-sm">
                    <FileText className="h-7 w-7" />
                  </div>
                  <p className="text-sm font-extrabold text-slate-900">Comprobante en formato PDF</p>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">Comprobante de transferencia bancaria / Mercado Pago</p>
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-black text-emerald-800 hover:text-emerald-950 bg-slate-100 hover:bg-slate-200 transition cursor-pointer border-t border-slate-300"
                >
                  <ExternalLink className="h-4 w-4" /> Abrir y revisar PDF en nueva pestaña
                </a>
              </div>
            ) : (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-xl bg-slate-50 border border-slate-300 hover:border-emerald-500 transition group shadow-sm"
              >
                <img
                  src={url}
                  alt="Comprobante de transferencia"
                  className="max-h-80 w-full object-contain bg-slate-100"
                />
                <span className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-black text-slate-800 group-hover:text-emerald-800 bg-slate-100 border-t border-slate-300 transition">
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir en otra pestaña
                </span>
              </a>
            )
          ) : errorImagen ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center text-sm text-amber-900">
              <AlertTriangle className="mx-auto h-6 w-6 text-amber-600 mb-1.5" />
              <p className="font-bold">{errorImagen}</p>
              <p className="text-xs text-amber-700 mt-1">
                Podés verificar los datos declarados en la tabla de arriba para decidir si aprobar o rechazar el turno.
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-6 text-center text-sm text-rose-700 font-semibold">
              {errorComprobante ?? 'Sin comprobante adjunto.'}
            </p>
          )}
        </div>

        {pidiendoMotivo && (
          <div className="mt-4">
            <label htmlFor="motivo-rechazo" className="mb-1 block text-xs font-bold text-slate-700">
              Motivo del rechazo
            </label>
            <textarea
              id="motivo-rechazo"
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition min-h-20"
              placeholder="Ej: el alias no coincide con el del predio"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
        )}

        {errorAccion && !pidiendoMotivo && (
          <p className="mt-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg font-semibold">
            {errorAccion}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="btn-danger flex-1 py-3 font-bold cursor-pointer"
            onClick={rechazar}
            disabled={ocupado}
          >
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Rechazar
          </button>
          <button
            type="button"
            className="btn-primary flex-1 py-3 font-bold cursor-pointer"
            onClick={aprobar}
            disabled={ocupado || comprobante === null}
          >
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            ¿Aprobar turno?
          </button>
        </div>
      </div>
    </div>
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
      <dt className="shrink-0 text-slate-700 font-bold">{etiqueta}</dt>
      <dd className="text-right font-bold text-slate-900">
        {valor}
        {secundario && <span className="block text-xs font-semibold text-slate-600">{secundario}</span>}
      </dd>
    </div>
  )
}
