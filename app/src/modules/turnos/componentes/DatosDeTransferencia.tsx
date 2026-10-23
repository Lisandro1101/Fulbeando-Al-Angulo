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
 * y los datos bancarios para adjuntar el comprobante con alto contraste y claridad.
 */
export function DatosDeTransferencia({ cobro, montoSena, precioTotal }: DatosDeTransferenciaProps) {
  const senaFinal = montoSena !== undefined 
    ? montoSena 
    : (precioTotal !== undefined ? calcularMontoSena(cobro, precioTotal) : (cobro.montoSena || 4000))
  
  const saldoEnCancha = precioTotal && precioTotal > senaFinal ? precioTotal - senaFinal : null

  return (
    <div className="space-y-4">
      <p className="text-xs sm:text-sm text-slate-600 font-medium">
        Transferí la seña a estos datos y subí el comprobante para congelar el turno.
      </p>

      {/* Resumen de montos de alto contraste */}
      <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-b from-amber-50 to-amber-100/50 p-4 space-y-2.5 shadow-sm">
        {precioTotal !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-700 font-semibold">Total de la cancha</span>
            <span className="font-extrabold text-slate-900">{formatearMoneda(precioTotal)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm pt-2 border-t border-amber-200">
          <span className="font-bold text-amber-900">
            Seña a transferir ahora {cobro.tipoSena === 'porcentaje' ? `(${cobro.porcentajeSena ?? 50}%)` : ''}
          </span>
          <span className="text-xl font-black text-amber-900">
            {formatearMoneda(senaFinal)}
          </span>
        </div>

        {saldoEnCancha !== null && (
          <div className="flex items-center justify-between text-xs text-slate-600 pt-1.5 border-t border-amber-200/70 font-medium">
            <span>Saldo restante a pagar en el predio</span>
            <span className="font-bold text-slate-800">{formatearMoneda(saldoEnCancha)}</span>
          </div>
        )}
      </div>

      <div className="space-y-2.5">
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
      // Clipboard bloqueado
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-100/80 border border-slate-300 p-3.5 hover:border-slate-400 transition-colors">
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-700">{etiqueta}</p>
        <p className="truncate font-mono text-sm font-bold text-slate-900 mt-0.5">{valor}</p>
      </div>
      {copiable && (
        <button
          type="button"
          onClick={copiar}
          aria-label={`Copiar ${etiqueta}`}
          className="shrink-0 rounded-xl p-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 hover:text-slate-950 shadow-sm transition-all cursor-pointer"
        >
          {copiado ? <Check className="h-4 w-4 text-emerald-600 font-bold" /> : <Copy className="h-4 w-4" />}
        </button>
      )}
    </div>
  )
}
