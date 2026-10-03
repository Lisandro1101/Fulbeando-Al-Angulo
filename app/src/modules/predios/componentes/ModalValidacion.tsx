import { useEffect, useState } from 'react'
import { AlertTriangle, Check, ExternalLink, Loader2, X } from 'lucide-react'
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
  const [error, setError] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    obtenerComprobante(turno.id)
      .then(async (c) => {
        if (!vigente) return
        setComprobante(c)
        if (c === null) {
          setError('No encontramos el comprobante de esta solicitud.')
          return
        }
        const link = await obtenerUrlComprobante(c.storagePath)
        if (vigente) setUrl(link)
      })
      .catch(() => {
        if (vigente) setError('No pudimos abrir el comprobante.')
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
    setError(null)
    try {
      await onAprobar(turno)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos aprobar el turno.')
      setOcupado(false)
    }
  }

  const rechazar = async () => {
    if (motivo.trim().length === 0) {
      setPidiendoMotivo(true)
      return
    }
    setOcupado(true)
    setError(null)
    try {
      await onRechazar(turno, motivo.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos rechazar el turno.')
      setOcupado(false)
    }
  }

  const venceHoy = turno.fecha === aFechaISO()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Validar solicitud de turno"
      onClick={(e) => {
        if (e.target === e.currentTarget && !ocupado) onCerrar()
      }}
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-card bg-canvas-raised p-4 sm:rounded-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">Validar solicitud</h2>
            <p className="text-sm text-ink-muted">
              {venceHoy ? 'Hoy' : formatearFechaCorta(turno.fecha)} · {turno.horaInicio} a{' '}
              {turno.horaFin}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={ocupado}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-ink-muted hover:bg-canvas hover:text-ink disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <dl className="mt-4 space-y-2 rounded-xl bg-canvas p-3 text-sm">
          <Fila
            etiqueta="Organizador"
            valor={turno.organizadorNombre ?? 'Sin nombre'}
            secundario={turno.organizadorTelefono ?? undefined}
          />
          <Fila etiqueta="Alias de pago" valor={comprobante?.alias ?? turno.montoSena.toString()} />
          <Fila etiqueta="Sena esperada" valor={formatearMoneda(turno.montoSena)} />
          <Fila
            etiqueta="Monto declarado"
            valor={comprobante ? formatearMoneda(comprobante.monto) : 'sin comprobante'}
          />
        </dl>

        {turno.montoSena !== comprobante?.monto && comprobante !== null && (
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-urgent-faint/30 px-3 py-2 text-xs text-urgent">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            El monto del comprobante no coincide con la seña requerida.
          </p>
        )}

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Comprobante
          </p>
          {cargando ? (
            <div className="grid h-48 place-items-center rounded-xl bg-canvas">
              <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
            </div>
          ) : url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-xl bg-canvas"
            >
              <img
                src={url}
                alt="Comprobante de transferencia"
                className="max-h-80 w-full object-contain"
              />
              <span className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-ink-muted">
                <ExternalLink className="h-3.5 w-3.5" /> Abrir en otra pestana
              </span>
            </a>
          ) : (
            <p className="rounded-xl bg-canvas px-3 py-6 text-center text-sm text-occupied">
              {error ?? 'Sin comprobante adjunto.'}
            </p>
          )}
        </div>

        {pidiendoMotivo && (
          <div className="mt-4">
            <label htmlFor="motivo-rechazo" className="mb-1 block text-xs text-ink-muted">
              Motivo del rechazo
            </label>
            <textarea
              id="motivo-rechazo"
              className="field min-h-20"
              placeholder="Ej: el alias no coincide con el del predio"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
        )}

        {error && !pidiendoMotivo && (
          <p className="mt-3 text-sm text-occupied">{error}</p>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="btn-danger flex-1"
            onClick={rechazar}
            disabled={ocupado}
          >
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Rechazar
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
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
      <dt className="shrink-0 text-ink-muted">{etiqueta}</dt>
      <dd className="text-right font-medium text-ink">
        {valor}
        {secundario && <span className="block text-xs font-normal text-ink-muted">{secundario}</span>}
      </dd>
    </div>
  )
}