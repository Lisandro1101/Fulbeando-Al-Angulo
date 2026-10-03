import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Plus, Trash2, Wand2 } from 'lucide-react'
import type { Franja, Predio } from '@/domain'
import { duracionDeFranja, errorEnFranjas, formatearDuracion, minutosDeHora, precioDeFranja } from '@/domain'
import { formatearMoneda } from '@/core/tiempo'
import { generarGrillaDelDia, generarGrillaMasiva } from '@/modules/turnos/repositorio'
import { listarCanchas } from '@/modules/canchas/repositorio'

/** Minutos desde medianoche -> `HH:mm`. El caller ya validó que no pase de 24 h. */
const formatearHora = (minutos: number): string =>
  `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`

/** Fila editable: hora de inicio y de fin, con la duracion calculada. */
function FranjaFila({
  franja,
  indice,
  onCambiar,
  onQuitar,
  puedeQuitar,
}: {
  franja: Franja
  indice: number
  onCambiar: (indice: number, franja: Franja) => void
  onQuitar: (indice: number) => void
  puedeQuitar: boolean
}) {
  const duracion = duracionDeFranja(franja)

  return (
    <li className="flex items-end gap-2">
      <div className="flex-1">
        <label className="mb-1 block text-xs text-ink-muted" htmlFor={`franja-inicio-${indice}`}>
          Franja {indice + 1}
        </label>
        <div className="flex items-center gap-1.5">
          <input
            id={`franja-inicio-${indice}`}
            type="time"
            step={300}
            value={franja.horaInicio}
            onChange={(e) => onCambiar(indice, { ...franja, horaInicio: e.target.value })}
            className="field px-2 py-2 text-sm"
          />
          <span className="text-ink-muted">a</span>
          <input
            type="time"
            step={300}
            value={franja.horaFin}
            onChange={(e) => onCambiar(indice, { ...franja, horaFin: e.target.value })}
            className="field px-2 py-2 text-sm"
          />
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          {duracion > 0 ? formatearDuracion(duracion) : 'revisar horarios'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onQuitar(indice)}
        disabled={!puedeQuitar}
        aria-label={`Quitar franja ${indice + 1}`}
        className="btn-ghost h-11 w-11 shrink-0 px-0"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  )
}

/**
 * Configuracion de la grilla del dia (PRD 4.4 "cargar turnos a mano").
 * El dueno define las franjas; la app crea los turnos `disponible` de todas
 * las canchas activas. Los IDs son deterministicos, asi que repetir la operacion
 * solo completa lo que falta y nunca pisa una reserva existente.
 */
export function GeneradorGrilla({
  predio,
  fecha,
  onGenerado,
}: {
  predio: Predio
  fecha: string
  onGenerado: () => void | Promise<void>
}) {
  const [franjas, setFranjas] = useState<Franja[]>([
    { horaInicio: '18:00', horaFin: '19:30' },
    { horaInicio: '19:30', horaFin: '21:00' },
  ])
  const [minutos, setMinutos] = useState(90)
  const [cerrar, setCerrar] = useState('23:00')
  const [generando, setGenerando] = useState(false)
  const [resultado, setResultado] = useState<{ creados: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [hasta, setHasta] = useState(fecha)
  const [dias, setDias] = useState<number[]>(() => {
    const d = new Date(fecha)
    const utcDay = d.getUTCDay()
    return [utcDay === 0 ? 7 : utcDay]
  })

  const [canchas, setCanchas] = useState<Array<{ id: string; nombre: string; precioHora: number }>>(
    [],
  )
  const [cargandoCanchas, setCargandoCanchas] = useState(true)

  // Fuente de verdad: la subcoleccion de canchas, no el resumen del predio.
  useEffect(() => {
    let vigente = true
    setCargandoCanchas(true)
    listarCanchas(predio.id)
      .then((lista) => {
        if (vigente) setCanchas(lista.map(({ id, nombre, precioHora }) => ({ id, nombre, precioHora })))
      })
      .finally(() => {
        if (vigente) setCargandoCanchas(false)
      })
    return () => {
      vigente = false
    }
  }, [predio.id])

  const problema = useMemo(() => errorEnFranjas(franjas), [franjas])
  const total = canchas.length * franjas.length

  const cambiar = (indice: number, franja: Franja) => {
    setResultado(null)
    setFranjas((prev) => prev.map((f, i) => (i === indice ? franja : f)))
  }

  const quitar = (indice: number) => {
    setResultado(null)
    setFranjas((prev) => prev.filter((_, i) => i !== indice))
  }

  const agregar = () => {
    setResultado(null)
    setFranjas((prev) => {
      const ultima = prev[prev.length - 1]
      if (!ultima) return [...prev, { horaInicio: '18:00', horaFin: '19:30' }]
      const h = Number(ultima.horaFin.slice(0, 2))
      const m = Number(ultima.horaFin.slice(3, 5))
      // Encadena 90 min desde el fin de la ultima; no cruza la medianoche.
      const totalMin = h * 60 + m + 90
      if (totalMin >= 24 * 60) return prev
      return [
        ...prev,
        { horaInicio: ultima.horaFin, horaFin: formatearHora(totalMin) },
      ]
    })
  }

  /** Completa desde la primera franja hasta la hora de cierre, en bloques de N min. */
  const completar = () => {
    setResultado(null)
    const paso = Math.max(15, Math.min(minutos, 240))
    const limite = minutosDeHora(cerrar)

    setFranjas((prev) => {
      const base = prev[0]
      if (!base) return prev
      const nuevas: Franja[] = []
      let cursor = minutosDeHora(base.horaInicio)
      while (cursor < limite) {
        nuevas.push({
          horaInicio: formatearHora(cursor),
          horaFin: formatearHora(Math.min(cursor + paso, limite)),
        })
        cursor += paso
      }
      return nuevas.length > 0 ? nuevas : prev
    })
  }

  const generar = async () => {
    setGenerando(true)
    setError(null)
    setResultado(null)
    try {
      const fechas = []
      const actual = new Date(fecha)
      const fin = new Date(hasta)
      
      if (fin < actual) {
         setError('La fecha de fin no puede ser anterior a la de inicio.')
         setGenerando(false)
         return
      }
      
      while (actual <= fin) {
        const d = actual.getUTCDay()
        const diaISO = d === 0 ? 7 : d
        if (dias.includes(diaISO)) {
          fechas.push(actual.toISOString().split('T')[0]!)
        }
        actual.setUTCDate(actual.getUTCDate() + 1)
      }

      if (fechas.length === 0) {
        setError('No hay fechas que coincidan con los dias seleccionados.')
        setGenerando(false)
        return
      }

      const creados = await generarGrillaMasiva(
        canchas.map(({ id, precioHora }) => ({ id, precioHora })),
        fechas,
        franjas,
        predio,
      )
      setResultado({ creados })
      await onGenerado()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos generar la grilla.')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Franjas de {fecha.split('-').reverse().join('/')}
        </p>
        <ul className="space-y-3">
          {franjas.map((franja, indice) => (
            <FranjaFila
              key={indice}
              franja={franja}
              indice={indice}
              onCambiar={cambiar}
              onQuitar={quitar}
              puedeQuitar={franjas.length > 1}
            />
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={agregar}>
          <Plus className="h-4 w-4" /> Agregar franja
        </button>
      </div>

      <details className="rounded-xl bg-canvas p-3">
        <summary className="cursor-pointer text-sm text-ink-muted">
          <Wand2 className="mr-1.5 inline h-4 w-4" />
          Completar automaticamente
        </summary>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-ink-muted" htmlFor="gen-minutos">
              Duracion (min)
            </label>
            <input
              id="gen-minutos"
              type="number"
              min={15}
              max={240}
              step={15}
              value={minutos}
              onChange={(e) => setMinutos(Number(e.target.value))}
              className="field w-24 px-2 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-muted" htmlFor="gen-cierre">
              Cierra a las
            </label>
            <input
              id="gen-cierre"
              type="time"
              step={300}
              value={cerrar}
              onChange={(e) => setCerrar(e.target.value)}
              className="field w-32 px-2 py-2 text-sm"
            />
          </div>
          <button type="button" className="btn-ghost" onClick={completar}>
            Aplicar
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Reemplaza las franjas desde la primera hora hasta el cierre. No impone
          ningun horario: los defaults solo viven en el formulario.
        </p>
      </details>

      <div className="rounded-xl border border-surface bg-surface p-4 space-y-4">
        <h3 className="text-sm font-semibold text-ink">Opciones de repeticion</h3>
        
        <div>
          <label className="mb-1 block text-xs text-ink-muted" htmlFor="gen-hasta">
            Generar desde el {fecha.split('-').reverse().join('/')} hasta el:
          </label>
          <input
            id="gen-hasta"
            type="date"
            value={hasta}
            min={fecha}
            onChange={(e) => setHasta(e.target.value)}
            className="field"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs text-ink-muted">Dias de la semana a generar</label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Lun', val: 1 },
              { label: 'Mar', val: 2 },
              { label: 'Mie', val: 3 },
              { label: 'Jue', val: 4 },
              { label: 'Vie', val: 5 },
              { label: 'Sab', val: 6 },
              { label: 'Dom', val: 7 },
            ].map(({ label, val }) => (
              <label key={val} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1.5 text-sm transition-colors hover:bg-canvas has-[:checked]:border-pitch has-[:checked]:bg-pitch/10">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={dias.includes(val)}
                  onChange={(e) => {
                    if (e.target.checked) setDias([...dias, val])
                    else setDias(dias.filter((d) => d !== val))
                  }}
                />
                <span className={dias.includes(val) ? 'font-medium text-pitch' : 'text-ink'}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm text-ink-muted">
        {cargandoCanchas ? (
          'Cargando canchas...'
        ) : canchas.length === 0 ? (
          'Este predio no tiene canchas activas, asi que no hay nada que generar.'
        ) : (
          <>
            {canchas.length} {canchas.length === 1 ? 'cancha' : 'canchas'} x {franjas.length}{' '}
            {franjas.length === 1 ? 'franja' : 'franjas'} = {total} turnos. Sena por turno:{' '}
            <span className="font-semibold text-ink">
              {formatearMoneda(predio.cobro.montoSena)}
            </span>
          </>
        )}
      </p>

      {!cargandoCanchas && canchas.length > 0 && problema === null && (
        <ul className="space-y-1 text-xs text-ink-muted">
          {canchas.map((cancha) => (
            <li key={cancha.id}>
              {cancha.nombre}: {formatearMoneda(cancha.precioHora)} por hora
              {franjas.length > 0 && (
                <>
                  {' → '}
                  <span className="font-medium text-ink">
                    {formatearMoneda(precioDeFranja(cancha.precioHora, franjas[0]!))}
                  </span>{' '}
                  por turno de {formatearDuracion(duracionDeFranja(franjas[0]!))}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {problema && <p className="text-sm text-urgent">{problema}</p>}
      {error && <p className="text-sm text-occupied">{error}</p>}
      {resultado && (
        <p className="flex items-center gap-2 text-sm text-pitch">
          <Check className="h-4 w-4" />
          {resultado.creados === 0
            ? 'La grilla ya estaba completa para esa fecha.'
            : `Se crearon ${resultado.creados} turnos.`}
        </p>
      )}

      <button
        type="button"
        className="btn-primary w-full"
        onClick={() => void generar()}
        disabled={generando || cargandoCanchas || problema !== null || canchas.length === 0}
      >
        {generando && <Loader2 className="h-4 w-4 animate-spin" />}
        Generar grilla
      </button>
    </div>
  )
}