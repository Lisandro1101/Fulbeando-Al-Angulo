import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { type DatosDeCobro, calcularMontoSena } from '@/domain'
import { formatearMoneda } from '@/core/tiempo'

interface DatosDeTransferenciaProps {
  cobro: DatosDeCobro
  montoSena?: number
  precioTotal?: number
}

/**
 * Datos de transferencia del predio. Muestra el total, la seña a transferir
 * y los datos bancarios para adjuntar el comprobante.
 */
export function DatosDeTransferencia({ cobro, montoSena, precioTotal }: DatosDeTransferenciaProps) {
  const senaFinal = montoSena !== undefined 
    ? montoSena 
    : (precioTotal !== undefined ? calcularMontoSena(cobro, precioTotal) : (cobro.montoSena || 4000))
  
  const saldoEnCancha = precioTotal && precioTotal > senaFinal ? precioTotal - senaFinal : null

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        Transferí la seña a estos datos y subí el comprobante para congelar el turno.
      </p>

      {/* Resumen de montos */}
      <div className="rounded-xl border border-zinc-800 bg-canvas/80 p-3.5 space-y-2">
        {precioTotal !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Total de la cancha</span>
            <span className="font-bold text-white">{formatearMoneda(precioTotal)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm pt-1 border-t border-zinc-800/60">
          <span className="font-bold text-amber-400">
            Seña a transferir ahora {cobro.tipoSena === 'porcentaje' ? `(${cobro.porcentajeSena ?? 50}%)` : ''}
          </span>
          <span className="text-lg font-black text-amber-400">
            {formatearMoneda(senaFinal)}
          </span>
        </div>

        {saldoEnCancha !== null && (
          <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/40">
            <span>Saldo restante a pagar en el predio</span>
            <span className="font-semibold text-zinc-300">{formatearMoneda(saldoEnCancha)}</span>
          </div>
        )}
      </div>

      {cobro.titular ? (
        <Campo etiqueta="Titular" valor={cobro.titular} copiable />
      ) : (
        <Campo etiqueta="Titular" valor="Consultar al predio" />
      )}

      {cobro.alias ? (
        <Campo etiqueta="Alias" valor={cobro.alias} copiable />
      ) : (
        <Campo etiqueta="Alias" valor="Sin alias cargado (consultar al predio)" />
      )}

      {cobro.cbu && <Campo etiqueta="CBU" valor={cobro.cbu} copiable />}
    </div>
  )
}

function Campo({
  etiqueta,
  valor,
  copiable,
}: {
  etiqueta: string
  valor: string
  copiable?: boolean
}) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch {
      // Clipboard bloqueado: el valor sigue visible para copiar a mano.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-3">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-ink-muted">{etiqueta}</p>
        <p className="truncate font-mono text-sm text-ink">{valor}</p>
      </div>
      {copiable && (
        <button
          type="button"
          onClick={copiar}
          aria-label={`Copiar ${etiqueta}`}
          className="shrink-0 rounded-lg p-2 text-ink-muted hover:bg-canvas-raised hover:text-ink"
        >
          {copiado ? <Check className="h-4 w-4 text-pitch" /> : <Copy className="h-4 w-4" />}
        </button>
      )}
    </div>
  )
}
