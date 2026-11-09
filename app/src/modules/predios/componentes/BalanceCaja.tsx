import { useMemo, useState, useEffect } from 'react'
import {
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Download,
  Filter,
  Loader2,
  Printer,
  Search,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react'
import type { Predio, Turno } from '@/domain'
import { aFechaISO, formatearFechaCorta, formatearMoneda, sumarDias } from '@/core/tiempo'
import { listarTurnosEnRango } from '@/modules/turnos/repositorio'
import { listarCanchas } from '@/modules/canchas/repositorio'

type PeriodoPredefinido = 'semana_actual' | 'mes_actual' | 'ultimos_30_dias' | 'personalizado'

export function BalanceCaja({ predio }: { predio: Predio }) {
  const hoy = aFechaISO()

  // Calcular inicio y fin de la semana actual (lunes a domingo)
  const [desde, setDesde] = useState(() => {
    const d = new Date()
    const diaSem = d.getUTCDay()
    const diff = diaSem === 0 ? -6 : 1 - diaSem // Lunes
    return sumarDias(hoy, diff)
  })
  const [hasta, setHasta] = useState(() => sumarDias(hoy, 7))
  const [periodo, setPeriodo] = useState<PeriodoPredefinido>('semana_actual')

  const [turnos, setTurnos] = useState<Turno[]>([])
  const [canchasMap, setCanchasMap] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'confirmado' | 'cancelado'>('todos')

  // Cargar nombres de canchas
  useEffect(() => {
    let vigente = true
    listarCanchas(predio.id).then((lista) => {
      if (!vigente) return
      const map: Record<string, string> = {}
      for (const c of lista) {
        map[c.id] = c.nombre
      }
      setCanchasMap(map)
    })
    return () => {
      vigente = false
    }
  }, [predio.id])

  // Cambiar rango según período predefinido
  const cambiarPeriodo = (tipo: PeriodoPredefinido) => {
    setPeriodo(tipo)
    const fechaHoy = aFechaISO()
    const d = new Date()

    if (tipo === 'semana_actual') {
      const diaSem = d.getUTCDay()
      const diffLunes = diaSem === 0 ? -6 : 1 - diaSem
      setDesde(sumarDias(fechaHoy, diffLunes))
      setHasta(sumarDias(fechaHoy, diffLunes + 6))
    } else if (tipo === 'mes_actual') {
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const ultimoDiaMes = new Date(Date.UTC(y, d.getUTCMonth() + 1, 0)).getUTCDate()
      setDesde(`${y}-${m}-01`)
      setHasta(`${y}-${m}-${String(ultimoDiaMes).padStart(2, '0')}`)
    } else if (tipo === 'ultimos_30_dias') {
      setDesde(sumarDias(fechaHoy, -30))
      setHasta(fechaHoy)
    }
  }

  // Cargar turnos del período seleccionado
  useEffect(() => {
    let vigente = true
    setCargando(true)
    listarTurnosEnRango(predio.id, desde, hasta)
      .then((data) => {
        if (vigente) {
          setTurnos(data)
        }
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [predio.id, desde, hasta])

  // Métricas financieras calculadas
  const metricas = useMemo(() => {
    const confirmados = turnos.filter((t) => t.estado === 'confirmado')
    const cancelados = turnos.filter((t) => t.estado === 'cancelado')
    const pendientes = turnos.filter((t) => t.estado === 'bloqueado_temporal')

    const senasCobradas = confirmados.reduce((acc, t) => acc + (t.montoSena || 0), 0)
    const totalFacturacionProyectada = confirmados.reduce((acc, t) => acc + (t.precioTotal || 0), 0)
    const saldoPendienteEnCancha = totalFacturacionProyectada - senasCobradas

    // Recaudación agrupada por cancha
    const porCancha: Record<string, { senas: number; cantidad: number }> = {}
    for (const t of confirmados) {
      const nombreCancha = canchasMap[t.canchaId] ?? `Cancha ${t.canchaId.slice(0, 4)}`
      if (!porCancha[nombreCancha]) {
        porCancha[nombreCancha] = { senas: 0, cantidad: 0 }
      }
      porCancha[nombreCancha]!.senas += t.montoSena || 0
      porCancha[nombreCancha]!.cantidad += 1
    }

    return {
      senasCobradas,
      totalFacturacionProyectada,
      saldoPendienteEnCancha,
      cantConfirmados: confirmados.length,
      cantCancelados: cancelados.length,
      cantPendientes: pendientes.length,
      totalTurnos: turnos.length,
      porCancha,
    }
  }, [turnos, canchasMap])

  // Turnos filtrados para la tabla
  const turnosFiltrados = useMemo(() => {
    return turnos
      .filter((t) => {
        if (filtroEstado !== 'todos' && t.estado !== filtroEstado) return false
        if (!busqueda) return true
        const q = busqueda.toLowerCase()
        const org = (t.organizadorNombre ?? '').toLowerCase()
        const tel = (t.organizadorTelefono ?? '').toLowerCase()
        const cancha = (canchasMap[t.canchaId] ?? '').toLowerCase()
        return org.includes(q) || tel.includes(q) || cancha.includes(q)
      })
      .sort((a, b) => `${b.fecha}T${b.horaInicio}`.localeCompare(`${a.fecha}T${a.horaInicio}`))
  }, [turnos, filtroEstado, busqueda, canchasMap])

  // Exportar reporte a archivo CSV compatible con Excel (BOM UTF-8)
  const exportarCSV = () => {
    const BOM = '\uFEFF'
    const headers = [
      'Fecha',
      'Hora Inicio',
      'Hora Fin',
      'Cancha',
      'Organizador',
      'Telefono',
      'Estado',
      'Seña Cobrada (ARS)',
      'Total Partido (ARS)',
      'Saldo Pendiente (ARS)',
      'Origen',
    ]

    const rows = turnosFiltrados.map((t) => {
      const canchaNombre = canchasMap[t.canchaId] ?? t.canchaId
      const orgNombre = (t.organizadorNombre ?? 'Sin nombre').replace(/"/g, '""')
      const orgTel = (t.organizadorTelefono ?? '-').replace(/"/g, '""')
      const sena = t.estado === 'confirmado' ? t.montoSena : 0
      const total = t.estado === 'confirmado' ? t.precioTotal : 0
      const saldo = Math.max(0, total - sena)

      return [
        t.fecha,
        t.horaInicio,
        t.horaFin,
        `"${canchaNombre}"`,
        `"${orgNombre}"`,
        `"${orgTel}"`,
        t.estado,
        sena,
        total,
        saldo,
        t.origen,
      ].join(';')
    })

    const csvContent = BOM + [headers.join(';'), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `balance-${predio.nombre.toLowerCase().replace(/\s+/g, '-')}-${desde}-al-${hasta}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Imprimir o guardar como PDF
  const imprimirReporte = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* HEADER DE CONTROL Y SELECTOR DE PERÍODO */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <CircleDollarSign className="w-5 h-5 text-emerald-600" /> Balance de Caja & Historial de Señas
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Control financiero detallado de ingresos por señas y cobranzas de mostrador en <span className="font-bold text-slate-700">{predio.nombre}</span>.
            </p>
          </div>

          {/* BOTONES DE EXPORTACIÓN */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportarCSV}
              disabled={turnos.length === 0}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Descargar archivo compatible con Microsoft Excel"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Excel / CSV
            </button>
            <button
              type="button"
              onClick={imprimirReporte}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Imprimir resumen o guardar como PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" /> Imprimir / PDF
            </button>
          </div>
        </div>

        {/* SELECTOR DE PERÍODO */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Período:
          </span>
          {[
            { id: 'semana_actual', label: 'Esta Semana' },
            { id: 'mes_actual', label: 'Este Mes' },
            { id: 'ultimos_30_dias', label: 'Últimos 30 días' },
            { id: 'personalizado', label: 'Personalizado' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => cambiarPeriodo(id as PeriodoPredefinido)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                periodo === id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}

          {/* SELECTORES DE FECHA DESDE / HASTA */}
          <div className="flex items-center gap-2 ml-auto text-xs">
            <input
              type="date"
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value)
                setPeriodo('personalizado')
              }}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-bold outline-none focus:border-emerald-500 shadow-2xs"
            />
            <span className="text-slate-400 font-bold">al</span>
            <input
              type="date"
              value={hasta}
              min={desde}
              onChange={(e) => {
                setHasta(e.target.value)
                setPeriodo('personalizado')
              }}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-bold outline-none focus:border-emerald-500 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS CLAVE (KPIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL SEÑAS COBRADAS */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
              Señas Cobradas (Caja)
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700">
              <CircleDollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-950 font-mono">
              {formatearMoneda(metricas.senasCobradas)}
            </span>
            <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
              Ingreso asegurado por comprobantes validados
            </p>
          </div>
        </div>

        {/* FACTURACIÓN TOTAL PROYECTADA */}
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-indigo-800 uppercase tracking-wider">
              Facturación Total Partidos
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-indigo-950 font-mono">
              {formatearMoneda(metricas.totalFacturacionProyectada)}
            </span>
            <p className="text-[11px] font-semibold text-indigo-700 mt-0.5">
              Valor nominal de todos los partidos confirmados
            </p>
          </div>
        </div>

        {/* SALDO PENDIENTE A COBRAR EN MOSTRADOR */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">
              A Cobrar en Mostrador
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-950 font-mono">
              {formatearMoneda(metricas.saldoPendienteEnCancha)}
            </span>
            <p className="text-[11px] font-semibold text-amber-700 mt-0.5">
              Resta abonar al ingresar al predio
            </p>
          </div>
        </div>

        {/* RESERVAS CONFIRMADAS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
              Partidos Confirmados
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {metricas.cantConfirmados}
            </span>
            <span className="text-xs text-slate-500 font-bold">
              de {metricas.totalTurnos} turnos ({metricas.cantCancelados} cancelados)
            </span>
          </div>
        </div>
      </div>

      {/* DESGLOSE POR CANCHA */}
      {Object.keys(metricas.porCancha).length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Rendimiento & Recaudación por Cancha
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(metricas.porCancha).map(([canchaNombre, info]) => {
              const porcentaje =
                metricas.senasCobradas > 0
                  ? Math.round((info.senas / metricas.senasCobradas) * 100)
                  : 0
              return (
                <div
                  key={canchaNombre}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-900">{canchaNombre}</span>
                    <span className="text-emerald-700 font-black">{formatearMoneda(info.senas)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                    <span>{info.cantidad} reservas</span>
                    <span>{porcentaje}% del total</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* HISTORIAL Y TABLA DETALLADA */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" /> Historial de Turnos y Cobranzas
            <span className="text-xs font-bold text-slate-500">
              ({turnosFiltrados.length} registros)
            </span>
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {/* BUSCADOR */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar organizador o teléfono..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-emerald-500 w-52"
              />
            </div>

            {/* FILTRO DE ESTADO */}
            <div className="flex items-center gap-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              {(['todos', 'confirmado', 'cancelado'] as const).map((est) => (
                <button
                  key={est}
                  type="button"
                  onClick={() => setFiltroEstado(est)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs capitalize transition cursor-pointer ${
                    filtroEstado === est
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {est}
                </button>
              ))}
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span className="text-xs font-bold">Cargando registros contables...</span>
          </div>
        ) : turnosFiltrados.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p className="text-sm font-semibold">No se encontraron turnos con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">Cancha</th>
                  <th className="py-2.5 px-3">Organizador</th>
                  <th className="py-2.5 px-3">Contacto</th>
                  <th className="py-2.5 px-3 text-right">Seña Cobrada</th>
                  <th className="py-2.5 px-3 text-right">Total Partido</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {turnosFiltrados.map((t) => {
                  const canchaNombre = canchasMap[t.canchaId] ?? `Cancha ${t.canchaId.slice(0, 4)}`
                  const esConfirmado = t.estado === 'confirmado'
                  const esCancelado = t.estado === 'cancelado'

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {formatearFechaCorta(t.fecha)} · {t.horaInicio} - {t.horaFin}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {canchaNombre}
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-900">
                        {t.organizadorNombre ?? (
                          <span className="text-slate-400 font-normal italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                        {t.organizadorTelefono ?? '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black font-mono text-emerald-700 whitespace-nowrap">
                        {esConfirmado ? formatearMoneda(t.montoSena) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-700 whitespace-nowrap">
                        {esConfirmado ? formatearMoneda(t.precioTotal) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {esConfirmado ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Cobrado
                          </span>
                        ) : esCancelado ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            <XCircle className="w-3 h-3" /> Cancelado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3" /> Pendiente
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
