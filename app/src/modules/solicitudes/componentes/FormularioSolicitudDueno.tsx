import { useEffect, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import type { EstadoSolicitud, TipoCancha } from '@/domain'
import { TIPOS_CANCHA, mensajeDeEstado } from '@/domain'
import type { Usuario } from '@/domain'
import {
  obtenerSolicitud,
  solicitarDueno,
  type AltaSolicitudDueno,
} from '@/modules/solicitudes/repositorio'

type Borrador = Omit<AltaSolicitudDueno, 'tipoCancha' | 'cantidadCanchas'> & {
  tipoCancha: TipoCancha
  cantidadCanchas: string
}

const desdeUsuario = (u: Usuario): Borrador => ({
  nombre: u.nombre,
  apellido: u.apellido,
  telefono: u.telefono ?? '',
  email: u.email,
  nombrePredio: '',
  ciudad: 'Buenos Aires',
  barrio: '',
  tipoCancha: 'F5',
  cantidadCanchas: '1',
  mensaje: '',
})

/**
 * Autodesdeclaracion de dueno de predio. El alta de canchas la habilita el rol
 * `dueno_predio`, que se concede recien cuando el superadmin aprueba esta
 * solicitud: pedir ser dueno no es convertirse en dueno.
 */
export function FormularioSolicitudDueno({ usuario }: { usuario: Usuario }) {
  const [borrador, setBorrador] = useState<Borrador>(() => desdeUsuario(usuario))
  const [estado, setEstado] = useState<EstadoSolicitud | null>(null)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    obtenerSolicitud(usuario.uid)
      .then((s) => {
        if (s === null) return
        setEstado(s.estado)
        setMotivo(s.motivoRechazo)
      })
      .catch(() => setEstado(null))
  }, [usuario.uid])

  const cambiar = <K extends keyof Borrador>(campo: K, valor: Borrador[K]) => {
    setError(null)
    setBorrador((prev) => ({ ...prev, [campo]: valor }))
  }

  const cantidad = Number(borrador.cantidadCanchas)
  const valido =
    borrador.nombre.trim().length >= 2 &&
    borrador.apellido.trim().length >= 2 &&
    borrador.telefono.trim().length >= 6 &&
    /\S+@\S+\.\S+/.test(borrador.email) &&
    borrador.nombrePredio.trim().length >= 3 &&
    borrador.barrio.trim().length >= 2 &&
    Number.isFinite(cantidad) &&
    cantidad >= 1 &&
    cantidad <= 50

  const yaAprobada = estado === 'aprobada'

  if (yaAprobada) {
    return (
      <p className="text-sm text-pitch">
        {mensajeDeEstado({ estado: 'aprobada', motivoRechazo: null })}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {estado !== null && (
        <div
          className={`rounded-xl px-3 py-2 text-sm ${
            estado === 'rechazada' ? 'bg-occupied-faint/30 text-occupied' : 'bg-urgent-faint/30 text-urgent'
          }`}
        >
          {mensajeDeEstado({ estado, motivoRechazo: motivo })}
        </div>
      )}

      {estado === 'pendiente' ? (
        <p className="text-sm text-ink-muted">
          Tu solicitud esta en revision. Apenas la aprueben te aparece el panel para cargar tus
          canchas.
        </p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setEnviando(true)
            setError(null)
            try {
              await solicitarDueno(usuario.uid, {
                ...borrador,
                cantidadCanchas: Math.round(cantidad),
              })
              setEstado('pendiente')
            } catch (err) {
              setError(err instanceof Error ? err.message : 'No pudimos enviar la solicitud.')
            } finally {
              setEnviando(false)
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo
              id="sol-nombre"
              etiqueta="Nombre"
              value={borrador.nombre}
              onChange={(v) => cambiar('nombre', v)}
              autoComplete="given-name"
            />
            <Campo
              id="sol-apellido"
              etiqueta="Apellido"
              value={borrador.apellido}
              onChange={(v) => cambiar('apellido', v)}
              autoComplete="family-name"
            />
            <Campo
              id="sol-telefono"
              etiqueta="Telefono (WhatsApp)"
              value={borrador.telefono}
              onChange={(v) => cambiar('telefono', v)}
              inputMode="tel"
            />
            <Campo
              id="sol-email"
              etiqueta="Email"
              type="email"
              value={borrador.email}
              onChange={(v) => cambiar('email', v)}
            />
          </div>

          <Campo
            id="sol-predio"
            etiqueta="Nombre del complejo"
            placeholder="Complejo Dewey"
            value={borrador.nombrePredio}
            onChange={(v) => cambiar('nombrePredio', v)}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <Campo
              id="sol-ciudad"
              etiqueta="Ciudad"
              value={borrador.ciudad}
              onChange={(v) => cambiar('ciudad', v)}
            />
            <Campo
              id="sol-barrio"
              etiqueta="Barrio / zona"
              value={borrador.barrio}
              onChange={(v) => cambiar('barrio', v)}
            />
            <div>
              <label className="mb-1 block text-xs text-ink-muted" htmlFor="sol-cantidad">
                Cuantas canchas
              </label>
              <input
                id="sol-cantidad"
                className="field"
                type="number"
                min={1}
                max={50}
                value={borrador.cantidadCanchas}
                onChange={(e) => cambiar('cantidadCanchas', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-ink-muted" htmlFor="sol-tipo">
              Tipo de cancha principal
            </label>
            <select
              id="sol-tipo"
              className="field"
              value={borrador.tipoCancha}
              onChange={(e) => cambiar('tipoCancha', e.target.value as TipoCancha)}
            >
              {TIPOS_CANCHA.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-ink-muted" htmlFor="sol-mensaje">
              Como nos known
            </label>
            <textarea
              id="sol-mensaje"
              className="field min-h-20"
              placeholder="Datos, como nos contactaste, hace cuanto existe..."
              value={borrador.mensaje}
              onChange={(e) => cambiar('mensaje', e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-occupied">{error}</p>}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={enviando || !valido}
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {estado === 'rechazada' ? 'Reenviar solicitud' : 'Enviar solicitud'}
          </button>
          <p className="text-xs text-ink-muted">
            Tu cuenta sigue como jugador hasta que aprobemos la solicitud.
          </p>
        </form>
      )}
    </div>
  )
}

function Campo({
  id,
  etiqueta,
  value,
  onChange,
  type = 'text',
  placeholder,
  inputMode,
  autoComplete,
}: {
  id: string
  etiqueta: string
  value: string
  onChange: (valor: string) => void
  type?: string
  placeholder?: string
  inputMode?: 'tel' | 'text' | 'numeric'
  autoComplete?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-ink-muted" htmlFor={id}>
        {etiqueta}
      </label>
      <input
        id={id}
        className="field"
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
