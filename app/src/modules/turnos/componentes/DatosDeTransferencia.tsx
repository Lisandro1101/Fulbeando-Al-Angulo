import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import type { DatosDeCobro } from '@/domain'
import { formatearMoneda } from '@/core/tiempo'

/**
 * Datos de transferencia del predio. El MVP no cobra nada: solo muestra los
 * datos para que el organizador pague por fuera y adjunte el comprobante.
 */
export function DatosDeTransferencia({ cobro }: { cobro: DatosDeCobro }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        Transferí la sena a estos datos y subí el comprobante para reservar.
      </p>

      <Campo etiqueta="Titular" valor={cobro.titular} copiable />
      <Campo etiqueta="Alias" valor={cobro.alias} copiable />
      {cobro.cbu && <Campo etiqueta="CBU" valor={cobro.cbu} copiable />}

      <div className="flex items-center justify-between rounded-xl bg-canvas px-3 py-3">
        <span className="text-sm text-ink-muted">Monto de sena</span>
        <span className="text-lg font-bold text-urgent">
          {formatearMoneda(cobro.montoSena)}
        </span>
      </div>
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
