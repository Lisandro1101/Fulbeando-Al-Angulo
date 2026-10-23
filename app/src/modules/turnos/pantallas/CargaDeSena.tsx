import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { CheckCircle2, FileImage, FileText, Loader2, Upload, X } from 'lucide-react'
import type { Predio, Turno } from '@/domain'
import { MAX_BYTES_COMPROBANTE, MINUTOS_BLOQUEO_TEMPORAL, canchasDe, calcularMontoSena, turnoId } from '@/domain'
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
import { CargandoFulbeando } from '@/modules/ui/overlays'

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
    const esImagen = elegido.type.startsWith('image/')
    const esPdf = elegido.type === 'application/pdf' || elegido.name.toLowerCase().endsWith('.pdf')
    if (!esImagen && !esPdf) {
      setError('El comprobante tiene que ser una imagen (JPG, PNG) o archivo PDF (ej: comprobante de Mercado Pago).')
      return
    }
    if (elegido.size > MAX_BYTES_COMPROBANTE) {
      setError('El archivo supera los 5 MB. Bajalo de peso y volvé a intentar.')
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
        montoSena: seleccion.montoSena ?? calcularMontoSena(predio.cobro, seleccion.precioTotal),
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
    } catch (e: any) {
      setVista('eligiendo')
      console.error('Error al solicitar turno:', e)
      const msj = typeof e?.message === 'string' ? e.message : ''
      if (msj.includes('evaluation error') || msj.includes('permission-denied') || msj.includes('PERMISSION_DENIED')) {
        setError('No tenés permisos para reservar este turno o el turno ya no está disponible.')
      } else if (msj.includes('No disponible') || msj.includes('TurnoNoDisponible')) {
        setError('El turno ya no está disponible. Elegí otro horario.')
      } else if (msj.includes('comprobante') || msj.includes('SinComprobante')) {
        setError('El comprobante es obligatorio para confirmar la seña.')
      } else {
        setError(msj && !msj.includes('@ L') ? msj : 'No pudimos enviar la solicitud. Revisá el comprobante e intentá de nuevo.')
      }
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
    return <CargandoFulbeando />
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
    const aprobado = turno.estado === 'confirmado'
    const rechazado = !aprobado && turno.estado === 'disponible' && Boolean(turno.motivoRechazo)
    const bloqueadoHasta = turno.bloqueadoHasta?.toMillis() ?? null
    const vencido = !aprobado && !rechazado && (
      (bloqueadoHasta !== null && bloqueadoHasta <= Date.now()) ||
      (turno.estado === 'disponible' && !turno.motivoRechazo)
    )

    return (
      <Pantalla titulo={aprobado ? '¡Reserva confirmada!' : 'Solicitud enviada'} subtitulo={predio.nombre}>
        <div className="space-y-4">
          {aprobado && (
            <div className="rounded-2xl bg-white border border-emerald-200 p-6 text-center shadow-sm">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="mt-3 text-lg font-black text-slate-900">Turno confirmado</h2>
              <p className="mt-1 text-sm text-slate-600 font-medium">
                {predio.nombre} te espera el {formatearFechaCorta(turno.fecha)} a las{' '}
                {turno.horaInicio}.
              </p>
            </div>
          )}

          {turno.estado === 'bloqueado_temporal' && !vencido && bloqueadoHasta !== null && (
            <TemporizadorBloqueo
              bloqueadoHastaMs={bloqueadoHasta}
              alVencer={alVencerBloqueo}
            />
          )}

          <Tarjeta titulo="Detalle del turno">
            <dl className="space-y-2.5 text-sm">
              <Fila etiqueta="Predio" valor={predio.nombre} />
              <Fila etiqueta="Fecha" valor={formatearFechaCorta(turno.fecha)} />
              <Fila etiqueta="Horario" valor={`${turno.horaInicio} a ${turno.horaFin}`} />
              <Fila etiqueta="Total" valor={formatearMoneda(turno.precioTotal)} />
              <Fila etiqueta="Seña abonada" valor={formatearMoneda(turno.montoSena)} />
              {turno.precioTotal > turno.montoSena && (
                <Fila etiqueta="Saldo en cancha" valor={formatearMoneda(turno.precioTotal - turno.montoSena)} />
              )}
            </dl>
            <div className="mt-3.5">
              {turno.estado === 'bloqueado_temporal' && !vencido && (
                <Etiqueta tono="urgent">Esperando validación del predio</Etiqueta>
              )}
              {aprobado && <Etiqueta tono="pitch">Confirmado</Etiqueta>}
              {vencido && (
                <Etiqueta tono="mute">Bloqueo vencido</Etiqueta>
              )}
              {rechazado && <Etiqueta tono="occupied">Rechazado</Etiqueta>}
            </div>
          </Tarjeta>

          {turno.estado === 'bloqueado_temporal' && !vencido && (
            <p className="text-xs sm:text-sm text-slate-600 font-semibold">
              El dueño del predio tiene {MINUTOS_BLOQUEO_TEMPORAL} minutos para revisar tu
              comprobante. Si no responde, avisamos por su parte y el turno vuelve a estar
              disponible.
            </p>
          )}

          {!aprobado && (vencido || rechazado) && (
            <p className="text-xs sm:text-sm text-rose-700 font-bold bg-rose-50 border border-rose-200 p-3 rounded-xl">
              {turno.motivoRechazo ?? 'El tiempo de espera expiró y el turno quedó disponible nuevamente.'}
            </p>
          )}

          <Link to="/turnos" className="btn-primary w-full py-3.5 text-center font-bold">
            Ver mis reservas
          </Link>
        </div>
      </Pantalla>
    )
  }

  const listoParaEnviar = seleccion !== null && archivo !== null && sesion.user !== null

  return (
    <div className="h-full flex flex-col bg-transparent">
      {contextState?.teamName && (
        <div className="bg-amber-500/10 text-amber-700 font-bold text-sm px-4 py-3 border-b border-amber-500/20 text-center animate-pulse">
          ⚽ Reservando turno para el partido de <span className="text-slate-900 font-black">{contextState.teamName}</span>
        </div>
      )}
      <Pantalla
        titulo="Cargar seña"
        subtitulo={`${predio.nombre} · ${predio.barrio}`}
        acciones={
          <Link
            to="/"
            className="text-xs font-bold text-indigo-200 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl border border-white/15 transition cursor-pointer"
          >
            Cambiar predio
          </Link>
        }
      >
        <div className="space-y-4">
          {!sesion.user && (
            <Tarjeta
              titulo="Necesitás una cuenta"
              descripcion="Tu solicitud queda asociada a tu perfil para que el predio sepa con quién hablar."
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
            {errorGrilla && <p className="mt-2 text-sm text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">{errorGrilla}</p>}
          </Tarjeta>

          <Tarjeta titulo="2. Transferí la seña">
            <DatosDeTransferencia
              cobro={predio.cobro}
              montoSena={seleccion?.montoSena}
              precioTotal={seleccion?.precioTotal}
            />
          </Tarjeta>

          <Tarjeta
            titulo="3. Subí el comprobante"
            descripcion="Foto o captura de la transferencia. Sin comprobante no se puede reservar."
          >
            {archivo ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 border border-emerald-300 px-4 py-3.5 shadow-sm">
                <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-900">
                  {archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf') ? (
                    <FileText className="h-5 w-5 shrink-0 text-rose-600" />
                  ) : (
                    <FileImage className="h-5 w-5 shrink-0 text-emerald-600" />
                  )}
                  <span className="truncate">{archivo.name}</span>
                  {(archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf')) && (
                    <span className="rounded bg-rose-100 text-rose-700 text-[10px] font-black px-1.5 py-0.5 uppercase tracking-wide">
                      PDF
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  aria-label="Quitar comprobante"
                  className="shrink-0 rounded-lg p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  onClick={() => setArchivo(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-500 px-4 py-8 text-center transition-all group shadow-sm">
                <Upload className="h-7 w-7 text-emerald-600 group-hover:scale-110 transition-transform mb-0.5" />
                <span className="text-sm font-black text-slate-900">Elegí o arrastrá el comprobante</span>
                <span className="text-xs text-slate-600 font-semibold">PDF, JPG, PNG o WEBP hasta 5 MB</span>
                <input
                  aria-label="Comprobante de seña"
                  type="file"
                  accept="image/*,application/pdf,.pdf"
                  className="sr-only"
                  onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
                />
              </label>
            )}

            {error && <p className="mt-3 text-sm text-rose-600 font-bold bg-rose-50 border border-rose-200 p-3 rounded-xl">{error}</p>}

            <button
              type="button"
              className="btn-primary mt-4 w-full py-3.5 font-black text-sm tracking-wide cursor-pointer shadow-lg shadow-emerald-600/25 disabled:opacity-50"
              disabled={!listoParaEnviar || vista === 'subiendo'}
              onClick={enviar}
            >
              {vista === 'subiendo' ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando solicitud...
                </span>
              ) : (
                'Enviar solicitud'
              )}
            </button>

            {seleccion && (
              <p className="mt-2.5 text-center text-xs text-slate-600 font-semibold">
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
      <dt className="text-slate-600 font-semibold">{etiqueta}</dt>
      <dd className="text-right font-black text-slate-900">{valor}</dd>
    </div>
  )
}
