import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { CheckCircle2, FileImage, Loader2, Upload, X } from 'lucide-react'
import type { Predio, Turno } from '@/domain'
import { MAX_BYTES_COMPROBANTE, MINUTOS_BLOQUEO_TEMPORAL, canchasDe, turnoId } from '@/domain'
import { formatearFechaCorta, formatearMoneda } from '@/core/tiempo'
import { obtenerPredio } from '@/modules/predios/repositorio'
import { obtenerTurno, solicitarTurno } from '@/modules/turnos/repositorio'
import { subirImagenComprobante } from '@/modules/comprobantes/repositorio'
import { BotonIngreso } from '@/modules/auth/BotonIngreso'
import { useSesion } from '@/modules/auth/useSesion'
import { DatosDeTransferencia } from '@/modules/turnos/componentes/DatosDeTransferencia'
import {
  SelectorFranja,
  useGrillaSemana,
  type Seleccion,
} from '@/modules/turnos/componentes/SelectorFranja'
import { TemporizadorBloqueo } from '@/modules/turnos/componentes/TemporizadorBloqueo'
import { Etiqueta, Pantalla, Tarjeta } from '@/modules/ui/pantalla'
import { NavegacionHeader } from '@/modules/ui/NavegacionHeader'

type Vista = 'eligiendo' | 'subiendo' | 'esperando'

export default function CargaDeSena() {
  const { predioId } = useParams<{ predioId: string }>()
  const sesion = useSesion()
  const location = useLocation()
  const contextState = location.state as { matchId?: number, teamName?: string } | undefined

  const [predio, setPredio] = useState<Predio | null>(null)
  const [cargandoPredio, setCargandoPredio] = useState(true)
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [vista, setVista] = useState<Vista>('eligiendo')
  const [turno, setTurno] = useState<Turno | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { fechas, turnos, cargando, error: errorGrilla } = useGrillaSemana(predioId ?? null)

  useEffect(() => {
    if (!predioId) {
      setPredio(null)
      setCargandoPredio(false)
      return
    }
    let vigente = true
    setCargandoPredio(true)
    obtenerPredio(predioId)
      .then((p) => {
        if (!vigente) return
        if (!p) setError('Ese predio no existe o ya no esta disponible.')
        setPredio(p)
      })
      .catch(() => {
        if (vigente) setError('No pudimos cargar el predio.')
      })
      .finally(() => {
        if (vigente) setCargandoPredio(false)
      })
    return () => {
      vigente = false
    }
  }, [predioId])

  const idTurno = useMemo(() => {
    if (!predioId || !seleccion) return null
    return turnoId({
      predioId,
      canchaId: seleccion.canchaId,
      fecha: seleccion.fecha,
      horaInicio: seleccion.horaInicio,
    })
  }, [predioId, seleccion])

  /** Al vencer el bloqueo vuelve a `disponible`: recargamos el turno y avisamos. */
  const alVencerBloqueo = useCallback(() => {
    setError('Vencio el bloqueo de 15 minutos. El turno quedo disponible otra vez.')
    if (idTurno) void obtenerTurno(idTurno).then(setTurno)
  }, [idTurno])

  // El dueno aprueba desde su panel: consultamos el estado cada 10 segundos.
  useEffect(() => {
    if (vista !== 'esperando' || turno === null) return
    if (turno.estado !== 'bloqueado_temporal') return
    if (turno.bloqueadoHasta === null) return

    const t = setInterval(() => {
      void obtenerTurno(turno.id).then(setTurno)
    }, 10000)
    return () => clearInterval(t)
  }, [vista, turno])

  const elegirArchivo = (elegido: File | null) => {
    setError(null)
    if (!elegido) {
      setArchivo(null)
      return
    }
    if (!elegido.type.startsWith('image/')) {
      setError('El comprobante tiene que ser una imagen (jpg, png o webp).')
      return
    }
    if (elegido.size > MAX_BYTES_COMPROBANTE) {
      setError('La imagen supera los 5 MB. Bajala de peso y volve a intentar.')
      return
    }
    setArchivo(elegido)
  }

  const enviar = async () => {
    if (!predio || !seleccion || !idTurno || !archivo) return
    const user = sesion.user
    if (!user) {
      setError('Necesitás iniciar sesión para reservar.')
      return
    }

    const usuario = sesion.usuario
    const uid = user.uid
    const nombreUsuario = usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : (user.displayName || 'Jugador')
    const telefonoUsuario = usuario?.telefono ?? user.phoneNumber ?? null

    setVista('subiendo')
    setError(null)
    try {
      const subida = await subirImagenComprobante({
        turnoId: idTurno,
        organizadorUid: uid,
        archivo,
      })

      const creado = await solicitarTurno({
        predioId: predio.id,
        canchaId: seleccion.canchaId,
        fecha: seleccion.fecha,
        horaInicio: seleccion.horaInicio,
        horaFin: seleccion.horaFin,
        precioTotal: seleccion.precioTotal,
        montoSena: predio.cobro.montoSena,
        alias: predio.cobro.alias,
        geo: predio.geo,
        organizador: {
          uid,
          nombre: nombreUsuario,
          telefono: telefonoUsuario,
        },
        comprobante: {
          // El path real lo devuelve el upload: no se reconstruye acá.
          storagePath: subida.storagePath,
          mimeType: subida.mimeType,
          sizeBytes: subida.sizeBytes,
        },
        partidoId: contextState?.matchId,
      })

      const fresco = await obtenerTurno(creado)
      setTurno(fresco)
      setVista('esperando')
    } catch (e) {
      setVista('eligiendo')
      setError(
        e instanceof Error
          ? e.message
          : 'No pudimos enviar la solicitud. Revisa el comprobante e intenta de nuevo.',
      )
    }
  }

  if (!predioId) {
    return (
      <Pantalla titulo="Reservar turno" subtitulo="Elegi el predio donde queres jugar.">
        <div className="space-y-4">
          <p className="surface text-sm text-ink-muted">
            Buscá una cancha desde la pantalla principal y abrí un predio para ver sus turnos.
          </p>
          <Link to="/" className="btn-primary w-full">
            Ver canchas
          </Link>
        </div>
      </Pantalla>
    )
  }

  if (cargandoPredio) {
    return (
      <Pantalla titulo="Reservar turno">
        <p className="surface flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando predio...
        </p>
      </Pantalla>
    )
  }

  if (!predio) {
    return (
      <Pantalla titulo="Reservar turno">
        <div className="space-y-4">
          <p className="surface text-sm text-occupied">{error ?? 'Predio no encontrado.'}</p>
          <Link to="/" className="btn-ghost w-full">
            Volver al mapa
          </Link>
        </div>
      </Pantalla>
    )
  }

  // Vista de espera: el turno ya esta bloqueado 15 minutos.
  if (vista === 'esperando' && turno) {
    const bloqueadoHasta = turno.bloqueadoHasta?.toMillis() ?? Date.now()
    const vencido = bloqueadoHasta <= Date.now()
    const aprobado = turno.estado === 'confirmado'
    const rechazado = turno.estado === 'disponible' && turno.motivoRechazo !== null

    return (
      <Pantalla titulo="Solicitud enviada" subtitulo={predio.nombre}>
        <div className="space-y-4">
          {aprobado && (
            <div className="surface text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-pitch" />
              <h2 className="mt-3 text-lg font-bold text-ink">Turno confirmado</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {predio.nombre} te espero el {formatearFechaCorta(turno.fecha)} a las{' '}
                {turno.horaInicio}.
              </p>
            </div>
          )}

          {turno.estado === 'bloqueado_temporal' && !vencido && (
            <TemporizadorBloqueo
              bloqueadoHastaMs={bloqueadoHasta}
              alVencer={alVencerBloqueo}
            />
          )}

          <Tarjeta titulo="Detalle del turno">
            <dl className="space-y-2 text-sm">
              <Fila etiqueta="Predio" valor={predio.nombre} />
              <Fila etiqueta="Fecha" valor={formatearFechaCorta(turno.fecha)} />
              <Fila etiqueta="Horario" valor={`${turno.horaInicio} a ${turno.horaFin}`} />
              <Fila etiqueta="Total" valor={formatearMoneda(turno.precioTotal)} />
              <Fila etiqueta="Sena" valor={formatearMoneda(turno.montoSena)} />
            </dl>
            <div className="mt-3">
              {turno.estado === 'bloqueado_temporal' && (
                <Etiqueta tono="urgent">Esperando validacion del predio</Etiqueta>
              )}
              {aprobado && <Etiqueta tono="pitch">Confirmado</Etiqueta>}
              {vencido && turno.estado === 'disponible' && (
                <Etiqueta tono="mute">Bloqueo vencido</Etiqueta>
              )}
              {rechazado && <Etiqueta tono="occupied">Rechazado</Etiqueta>}
            </div>
          </Tarjeta>

          {turno.estado === 'bloqueado_temporal' && !vencido && (
            <p className="text-sm text-ink-muted">
              El dueño del predio tiene {MINUTOS_BLOQUEO_TEMPORAL} minutos para revisar tu
              comprobante. Si no responde, avisamos por su parte y el turno vuelve a estar
              disponible.
            </p>
          )}

          {(vencido || rechazado) && (
            <p className="text-sm text-ink-muted">
              {turno.motivoRechazo ?? 'El turno quedo disponible nuevamente.'}
            </p>
          )}

          <Link to="/dashboard" className="btn-primary w-full">
            Ver mis partidos
          </Link>
        </div>
      </Pantalla>
    )
  }

  const listoParaEnviar = seleccion !== null && archivo !== null && sesion.user !== null

  return (
    <div className="h-full bg-canvas pb-safe">
      <NavegacionHeader />
      {contextState?.teamName && (
        <div className="bg-amber-500/10 text-amber-500 font-bold text-sm px-4 py-3 border-b border-amber-500/20 text-center animate-pulse">
          ⚽ Reservando turno para el partido de <span className="text-white">{contextState.teamName}</span>
        </div>
      )}
      <Pantalla
        titulo="Cargar seña"
        subtitulo={`${predio.nombre} · ${predio.barrio}`}
        acciones={
          <Link to="/" className="text-sm text-ink-muted hover:text-ink">
            Cambiar
          </Link>
        }
      >
      <div className="space-y-4">
        {!sesion.user && (
          <Tarjeta
            titulo="Necesitás una cuenta"
            descripcion="Tu solicitud queda asociada a tu perfil para que el predio sepa con quien falar."
          >
            <BotonIngreso />
          </Tarjeta>
        )}

        <Tarjeta titulo="1. Elegí cancha y horario">
          <SelectorFranja
            predio={predio}
            canchas={canchasDe(predio)}
            turnos={turnos}
            fechas={fechas}
            seleccion={seleccion}
            alSeleccionar={setSeleccion}
            cargando={cargando}
          />
          {errorGrilla && <p className="mt-2 text-sm text-occupied">{errorGrilla}</p>}
        </Tarjeta>

        <Tarjeta titulo="2. Transferí la seña">
          <DatosDeTransferencia cobro={predio.cobro} />
        </Tarjeta>

        <Tarjeta
          titulo="3. Subí el comprobante"
          descripcion="Foto o captura de la transferencia. Sin comprobante no se puede reservar."
        >
          {archivo ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-3">
              <p className="flex min-w-0 items-center gap-2 text-sm text-ink">
                <FileImage className="h-4 w-4 shrink-0 text-pitch" />
                <span className="truncate">{archivo.name}</span>
              </p>
              <button
                type="button"
                aria-label="Quitar comprobante"
                className="shrink-0 rounded-lg p-2 text-ink-muted hover:text-ink"
                onClick={() => setArchivo(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-ink-faint/40 px-4 py-8 text-center hover:border-pitch">
              <Upload className="h-6 w-6 text-ink-muted" />
              <span className="text-sm font-medium text-ink">Elegí la imagen del comprobante</span>
              <span className="text-xs text-ink-muted">JPG, PNG o WEBP hasta 5 MB</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
              />
            </label>
          )}

          {error && <p className="mt-3 text-sm text-occupied">{error}</p>}

          <button
            type="button"
            className="btn-primary mt-4 w-full"
            disabled={!listoParaEnviar || vista === 'subiendo'}
            onClick={enviar}
          >
            {vista === 'subiendo' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Enviando solicitud...
              </>
            ) : (
              'Enviar solicitud'
            )}
          </button>

          {seleccion && (
            <p className="mt-2 text-center text-xs text-ink-muted">
              El turno queda bloqueado {MINUTOS_BLOQUEO_TEMPORAL} minutos hasta que el predio
              valide el comprobante.
            </p>
          )}
        </Tarjeta>
      </div>
    </Pantalla>
    </div>
  )
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-muted">{etiqueta}</dt>
      <dd className="text-right font-medium text-ink">{valor}</dd>
    </div>
  )
}
