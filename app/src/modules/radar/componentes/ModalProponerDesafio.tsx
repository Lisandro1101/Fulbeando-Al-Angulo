import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Swords,
  Clock,
  MapPin,
  Send,
  Shield,
  AlertCircle,
  Loader2,
  Check,
  MessageSquareQuote,
  CheckCheck,
  RefreshCw,
  Trophy,
  ArrowRight,
  Flame,
} from 'lucide-react';
import type { ModalidadDesafio, PingTactico, PropuestaPactoPartido } from '@/domain';
import {
  obtenerEquiposDeUsuario,
  enviarDesafioDirectoEquipo,
  buscarDesafioActivoEntreEquipos,
  escucharDesafioPacto,
  agregarPingTacticoDesafio,
  responderDesafioEquipo,
  marcarDesafioComoLeido,
  type InvitacionEquipo,
} from '@/modules/teams/teamService';
import { calcularDivisionEquipo } from '@/domain/equipo';

interface ModalProponerDesafioProps {
  abierto: boolean;
  onCerrar: () => void;
  rival: {
    equipoId: string;
    nombre: string;
    modalidad?: string;
    escudoUrl?: string | null;
    captainId?: string;
    divisionInfo?: { nombre: string; color: string; badge: string };
  };
  usuarioActual: {
    uid: string;
    nombre?: string;
    apellido?: string;
  };
  desafioInicial?: InvitacionEquipo | null;
  onDesafioEnviado?: (mensaje: string) => void;
}

// Chips de Horarios
const CHIPS_HORARIOS = [
  'Hoy 20:00 hs',
  'Mañana 21:00 hs',
  'Este Viernes 20:30 hs',
  'Este Sábado 18:00 hs',
  'Este Domingo 19:00 hs',
  'Lunes que viene 21 hs',
];

// Chips Tácticos y Folklore
const CHIPS_TACTICOS = [
  '¿Tienen arquero o atajan todos? 🧤',
  'Tenemos pecheras y pelota 👕',
  '¿Sale tercer tiempo después? 🍺',
  'Jugamos tranquilo y parejo 🤝',
  'Somos 5 justos sin suplentes 🏃',
  'Confirmadísimo de nuestro lado ⚽',
  'Tenemos suplentes para rotar 🔄',
];

// Chips de Contraoferta rápida en el chat
const CHIPS_CHAT_CONTRAPROPUESTA = [
  'Preferimos 30 min más tarde ⏰',
  'Nos queda mejor el Sábado 📅',
  'Pasemos a las 21:00 hs 🌙',
  'Tenemos cancha nosotros 🟢',
  'Buscamos cancha a medias ⚽',
  '¿Se puede pasar a F7? ⚽',
];

export const ModalProponerDesafio: React.FC<ModalProponerDesafioProps> = ({
  abierto,
  onCerrar,
  rival,
  usuarioActual,
  desafioInicial,
  onDesafioEnviado,
}) => {
  const navigate = useNavigate();

  // Estados de carga e identificación de equipo
  const [misEquipos, setMisEquipos] = useState<any[]>([]);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [equipoSeleccionadoId, setEquipoSeleccionadoId] = useState<string>('');

  // Desafío activo encontrado o recién creado
  const [desafioActivo, setDesafioActivo] = useState<InvitacionEquipo | null>(desafioInicial || null);

  // Estados para creación inicial por chips (si no hay desafío previo)
  const [modalidad, setModalidad] = useState<ModalidadDesafio>('F5');
  const [horarioSeleccionado, setHorarioSeleccionado] = useState(CHIPS_HORARIOS[2]);
  const [horarioPersonalizado, setHorarioPersonalizado] = useState('');
  const [usarPersonalizado, setUsarPersonalizado] = useState(false);
  const [canchaOpcion, setCanchaOpcion] = useState<'con_cancha' | 'busca_cancha' | 'rival_propone'>('busca_cancha');
  const [predioNombre, setPredioNombre] = useState('');
  const [pingSeleccionado, setPingSeleccionado] = useState<string>(CHIPS_TACTICOS[0]);
  const [pingLibre, setPingLibre] = useState('');

  // Estados de mensajería en el chat en vivo
  const [categoriaChipChat, setCategoriaChipChat] = useState<'tacticos' | 'horarios' | 'cancha'>('tacticos');
  const [textoMensajeChat, setTextoMensajeChat] = useState('');
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const [procesandoPacto, setProcesandoPacto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastExito, setToastExito] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Carga inicial: cargar mis equipos y buscar si ya existe un desafío con este rival
  useEffect(() => {
    if (!abierto || !usuarioActual?.uid) return;
    setCargandoInicial(true);
    setError(null);

    if (desafioInicial) {
      setDesafioActivo(desafioInicial);
      if (desafioInicial.destinatarioUid === usuarioActual.uid && !desafioInicial.leida) {
        marcarDesafioComoLeido(desafioInicial.id);
      }
      obtenerEquiposDeUsuario(usuarioActual.uid)
        .then((eqs) => {
          setMisEquipos(eqs);
          if (eqs.length > 0) {
            const cap = eqs.find((e) => e.captainId === usuarioActual.uid) || eqs[0];
            setEquipoSeleccionadoId(cap.id);
          }
        })
        .finally(() => setCargandoInicial(false));
      return;
    }

    Promise.all([
      obtenerEquiposDeUsuario(usuarioActual.uid),
      buscarDesafioActivoEntreEquipos(usuarioActual.uid, rival.equipoId, rival.captainId, rival.nombre),
    ])
      .then(([eqs, desafioExistente]) => {
        setMisEquipos(eqs);
        if (eqs.length > 0) {
          const cap = eqs.find((e) => e.captainId === usuarioActual.uid) || eqs[0];
          setEquipoSeleccionadoId(cap.id);
          if (cap.formato && ['F5', 'F7', 'F8', 'F11'].includes(cap.formato)) {
            setModalidad(cap.formato as ModalidadDesafio);
          }
        }
        if (desafioExistente) {
          setDesafioActivo(desafioExistente);
          if (desafioExistente.destinatarioUid === usuarioActual.uid && !desafioExistente.leida) {
            marcarDesafioComoLeido(desafioExistente.id);
          }
        } else {
          setDesafioActivo(null);
        }
      })
      .catch((err) => {
        console.error('Error al inicializar desafío:', err);
        setError('No pudimos cargar la información del equipo.');
      })
      .finally(() => setCargandoInicial(false));
  }, [abierto, usuarioActual?.uid, rival.equipoId, desafioInicial]);

  // 2. Suscripción en tiempo real al pacto/desafío si está activo
  useEffect(() => {
    if (!desafioActivo?.id) return;
    const unsub = escucharDesafioPacto(desafioActivo.id, (actualizado) => {
      if (actualizado) {
        setDesafioActivo(actualizado);
      }
    });
    return () => unsub();
  }, [desafioActivo?.id]);

  // Auto-scroll hacia el final de la conversación
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [desafioActivo?.pactoPartido?.pingsTacticos]);

  if (!abierto) return null;

  const equipoEmisor = misEquipos.find((e) => e.id === equipoSeleccionadoId);
  const divisionEmisor = equipoEmisor ? calcularDivisionEquipo(equipoEmisor) : null;
  const nombreUsuario = `${usuarioActual.nombre || ''} ${usuarioActual.apellido || ''}`.trim() || 'Capitán';

  // 3. Crear propuesta inicial e ingresar inmediatamente al chat
  const handleCrearDesafioInicial = async () => {
    if (!equipoEmisor) {
      setError('Tenés que seleccionar un equipo para lanzar el desafío.');
      return;
    }
    const capIdRival = rival.captainId;
    if (!capIdRival) {
      setError('Este equipo no tiene un capitán asignado para recibir el desafío.');
      return;
    }

    const fechaFinal = usarPersonalizado ? horarioPersonalizado.trim() : horarioSeleccionado;
    if (!fechaFinal) {
      setError('Por favor indicá un día y horario tentativo.');
      return;
    }

    const pingFinal = pingLibre.trim() || pingSeleccionado;

    setEnviandoMensaje(true);
    setError(null);

    try {
      const invId = await enviarDesafioDirectoEquipo(
        usuarioActual.uid,
        nombreUsuario,
        {
          id: equipoEmisor.id,
          nombre: equipoEmisor.name || equipoEmisor.nombre || 'Mi Equipo',
          escudoUrl: equipoEmisor.shieldUrl || equipoEmisor.escudoUrl || null,
          division: divisionEmisor?.nombre,
        },
        {
          id: rival.equipoId,
          nombre: rival.nombre,
          escudoUrl: rival.escudoUrl ?? null,
          captainId: capIdRival,
        },
        {
          modalidad,
          fechaTentativa: fechaFinal,
          fechaUnix: Date.now() + 24 * 3600 * 1000,
          canchaOpcion,
          predioNombre: canchaOpcion === 'con_cancha' ? predioNombre.trim() : undefined,
          pingInicial: pingFinal,
        }
      );

      // Creamos la estructura inicial localmente para mostrar el chat inmediatamente
      const nuevoPacto: PropuestaPactoPartido = {
        id: invId,
        modalidad,
        fechaTentativa: fechaFinal,
        fechaUnix: Date.now() + 24 * 3600 * 1000,
        canchaOpcion,
        predioNombre: canchaOpcion === 'con_cancha' ? (predioNombre.trim() || null) : null,
        pingsTacticos: [
          {
            emisorUid: usuarioActual.uid,
            emisorNombre: nombreUsuario,
            equipoNombre: equipoEmisor.name || equipoEmisor.nombre || 'Mi Equipo',
            texto: pingFinal,
            fecha: Date.now(),
          },
        ],
        estado: 'propuesto',
        equipoDesafianteId: equipoEmisor.id,
        equipoDesafianteNombre: equipoEmisor.name || equipoEmisor.nombre || 'Mi Equipo',
        equipoDesafianteEscudoUrl: equipoEmisor.shieldUrl || equipoEmisor.escudoUrl || null,
        equipoDesafianteDivision: divisionEmisor?.nombre ?? null,
        equipoRivalId: rival.equipoId,
        equipoRivalNombre: rival.nombre,
        equipoRivalEscudoUrl: rival.escudoUrl ?? null,
        creadoPorUid: usuarioActual.uid,
        destinatarioUid: capIdRival,
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      };

      setDesafioActivo({
        id: invId,
        tipo: 'desafio_equipo',
        equipoId: equipoEmisor.id,
        equipoNombre: equipoEmisor.name || equipoEmisor.nombre || 'Mi Equipo',
        remitenteUid: usuarioActual.uid,
        destinatarioUid: capIdRival,
        estado: 'pendiente',
        pactoPartido: nuevoPacto,
      } as InvitacionEquipo);

      onDesafioEnviado?.(`¡Desafío iniciado con ${rival.nombre}! Ya podés acordar los detalles ⚽`);
    } catch (err: any) {
      console.error('Error enviando desafío inicial:', err);
      setError(err?.message || 'Hubo un error al enviar el desafío.');
    } finally {
      setEnviandoMensaje(false);
    }
  };

  // 4. Enviar un ping o chip táctico dentro del chat
  const handleEnviarMensajeChat = async (textoAEnviar?: string) => {
    const texto = (textoAEnviar || textoMensajeChat).trim();
    if (!texto || !desafioActivo?.id) return;

    setEnviandoMensaje(true);
    setError(null);
    try {
      const pingNuevo: PingTactico = {
        emisorUid: usuarioActual.uid,
        emisorNombre: nombreUsuario,
        equipoNombre: equipoEmisor?.name || equipoEmisor?.nombre || 'Mi Equipo',
        texto: texto.slice(0, 160),
        fecha: Date.now(),
      };

      // Si el chip seleccionado propone una hora o cancha, detectarlo
      const cambios: any = {};
      if (texto.includes('Sábado')) cambios.nuevaFechaTentativa = 'Sábado a convenir';
      if (texto.includes('30 min más tarde')) cambios.nuevaFechaTentativa = `${desafioActivo.pactoPartido?.fechaTentativa || 'Hoy'} (+30 min)`;
      if (texto.includes('21:00 hs')) cambios.nuevaFechaTentativa = '21:00 hs';
      if (texto.includes('Tenemos cancha')) {
        cambios.nuevaCanchaOpcion = 'con_cancha';
        cambios.nuevoPredioNombre = 'Cancha propia del rival';
      } else if (texto.includes('A medias') || texto.includes('a medias')) {
        cambios.nuevaCanchaOpcion = 'busca_cancha';
      }

      await agregarPingTacticoDesafio(desafioActivo.id, pingNuevo, Object.keys(cambios).length > 0 ? cambios : undefined);
      setTextoMensajeChat('');
    } catch (err: any) {
      console.error('Error enviando mensaje en el chat:', err);
      setError(err?.message || 'No se pudo enviar el mensaje.');
    } finally {
      setEnviandoMensaje(false);
    }
  };

  // 5. Pactar partido (Aceptar acuerdo)
  const handlePactarPartido = async () => {
    if (!desafioActivo?.id) return;
    setProcesandoPacto(true);
    setError(null);
    try {
      await responderDesafioEquipo(desafioActivo.id, 'pactado', {
        emisorUid: usuarioActual.uid,
        emisorNombre: nombreUsuario,
        equipoNombre: equipoEmisor?.name || equipoEmisor?.nombre || 'Mi Equipo',
        pingTexto: '¡Trato hecho! Partido pactado 🤝⚽',
      });
      setToastExito(`¡Partido pactado contra ${rival.nombre}! ⚽ Agendado en Mi Equipo`);
    } catch (err: any) {
      console.error('Error pactando partido:', err);
      setError(err?.message || 'No se pudo pactar el partido.');
    } finally {
      setProcesandoPacto(false);
    }
  };

  // 6. Rechazar o cancelar propuesta
  const handleRechazarDesafio = async () => {
    if (!desafioActivo?.id) return;
    setProcesandoPacto(true);
    try {
      await responderDesafioEquipo(desafioActivo.id, 'rechazado', {
        emisorUid: usuarioActual.uid,
        emisorNombre: nombreUsuario,
        equipoNombre: equipoEmisor?.name || equipoEmisor?.nombre || 'Mi Equipo',
        pingTexto: 'Desafío descartado por el momento.',
      });
      onCerrar();
    } catch (err: any) {
      console.error('Error rechazando desafío:', err);
      setError('No se pudo cancelar el desafío.');
    } finally {
      setProcesandoPacto(false);
    }
  };

  const pacto = desafioActivo?.pactoPartido;
  const pings = pacto?.pingsTacticos || [];
  const yaEstaPactado = pacto?.estado === 'pactado';
  const estaRechazado = pacto?.estado === 'rechazado';

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0B0F19] border border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-left my-auto flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Botón Cerrar */}
        <button
          onClick={onCerrar}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700/80 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer z-10"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado Matchup entre Equipos */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 pr-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Swords className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate flex items-center gap-1.5">
                <span>{desafioActivo ? 'Chat de Desafío' : 'Pactar Desafío Directo'}</span>
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium truncate">
                Negociación táctica por chips capitán a capitán
              </p>
            </div>
          </div>

          {/* Badge de Estado si el chat está activo */}
          {desafioActivo && (
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full shrink-0 border ${
                yaEstaPactado
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : estaRechazado
                  ? 'bg-red-500/20 text-red-300 border-red-500/50'
                  : pacto?.estado === 'contraoferta'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                  : 'bg-sky-500/20 text-sky-300 border-sky-500/50'
              }`}
            >
              {yaEstaPactado
                ? 'Pactado ⚽'
                : estaRechazado
                ? 'Rechazado'
                : pacto?.estado === 'contraoferta'
                ? 'Contraoferta'
                : 'En Acuerdo'}
            </span>
          )}
        </div>

        {/* Notificación Toast flotante */}
        {toastExito && (
          <div className="bg-emerald-500 text-zinc-950 font-black text-xs px-4 py-2.5 rounded-xl mt-3 flex items-center justify-between shadow-lg animate-bounce">
            <span>{toastExito}</span>
            <button
              onClick={() => {
                onCerrar();
                navigate('/equipo');
              }}
              className="underline text-[11px] ml-2 cursor-pointer"
            >
              Ver Equipo →
            </button>
          </div>
        )}

        {/* Tarjeta Visual: Rival vs Mi Equipo */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 my-3 flex items-center justify-between shadow-inner">
          {/* Mi Equipo */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-emerald-500/60 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              {equipoEmisor?.shieldUrl || equipoEmisor?.escudoUrl ? (
                <img
                  src={equipoEmisor.shieldUrl || equipoEmisor.escudoUrl}
                  alt={equipoEmisor.name || equipoEmisor.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Shield className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[9px] uppercase tracking-wider font-black text-emerald-400 block truncate">
                Mi Equipo
              </span>
              <h4 className="text-white font-black text-xs sm:text-sm truncate">
                {equipoEmisor ? equipoEmisor.name || equipoEmisor.nombre : 'Seleccionar'}
              </h4>
            </div>
          </div>

          <div className="px-2 py-1 bg-zinc-800 rounded-lg text-amber-400 font-black text-xs shrink-0 mx-1 border border-zinc-700/60">
            VS
          </div>

          {/* Equipo Rival */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-end text-right">
            <div className="min-w-0">
              <span className="text-[9px] uppercase tracking-wider font-black text-amber-400 block truncate">
                Rival
              </span>
              <h4 className="text-white font-black text-xs sm:text-sm truncate">{rival.nombre}</h4>
            </div>
            <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-amber-500/60 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              {rival.escudoUrl ? (
                <img src={rival.escudoUrl} alt={rival.nombre} className="w-full h-full object-cover" />
              ) : (
                <Shield className="w-5 h-5 text-amber-500" />
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MODO A: CHAT ACTIVO DE NEGOCIACIÓN ENTRE CAPITANES       */}
        {/* ======================================================== */}
        {desafioActivo && pacto ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Barra Táctica con Términos Actuales del Desafío */}
            <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800/90 rounded-xl px-3 py-2 text-xs mb-2.5 gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                <span className="bg-amber-500 text-zinc-950 font-black px-1.5 py-0.5 rounded text-[10px]">
                  {pacto.modalidad}
                </span>
                <Clock className="w-3.5 h-3.5 text-amber-400 ml-1" />
                <span className="truncate">{pacto.fechaTentativa}</span>
              </div>
              <div className="flex items-center gap-1 text-zinc-300 text-[11px] truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {pacto.canchaOpcion === 'con_cancha'
                    ? pacto.predioNombre || 'Cancha reservada'
                    : pacto.canchaOpcion === 'busca_cancha'
                    ? 'Cancha a medias'
                    : 'Rival propone predio'}
                </span>
              </div>
            </div>

            {/* Feed de Mensajes / Pings Tácticos */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto space-y-2.5 p-2 bg-zinc-950/60 border border-zinc-800/60 rounded-2xl min-h-[140px] max-h-[220px]"
            >
              {pings.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-xs">
                  <MessageSquareQuote className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  Iniciá la conversación tocando un chip abajo
                </div>
              ) : (
                pings.map((p, idx) => {
                  const esMio = p.emisorUid === usuarioActual.uid;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${esMio ? 'items-end' : 'items-start'} animate-fade-in`}
                    >
                      <span className="text-[10px] text-zinc-400 font-bold px-1 mb-0.5">
                        {esMio ? 'Vos' : p.emisorNombre || p.equipoNombre}
                      </span>
                      <div
                        className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                          esMio
                            ? 'bg-gradient-to-r from-amber-600/35 to-amber-500/25 border border-amber-500/50 text-white rounded-tr-none'
                            : 'bg-zinc-800/90 border border-zinc-700/80 text-white rounded-tl-none'
                        }`}
                      >
                        {p.texto}
                        <div className="text-[9px] text-zinc-400 text-right mt-1 font-mono">
                          {new Date(p.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sección de Chips Tácticos Rápidos */}
            {!yaEstaPactado && !estaRechazado && (
              <div className="mt-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-2.5">
                {/* Selector de Categorías de Chips */}
                <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-zinc-800 text-[11px] font-black uppercase">
                  <button
                    type="button"
                    onClick={() => setCategoriaChipChat('tacticos')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      categoriaChipChat === 'tacticos'
                        ? 'bg-amber-500 text-zinc-950 shadow-sm'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>⚡ Táctico</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoriaChipChat('horarios')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      categoriaChipChat === 'horarios'
                        ? 'bg-amber-500 text-zinc-950 shadow-sm'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>⏰ Horarios</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoriaChipChat('cancha')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      categoriaChipChat === 'cancha'
                        ? 'bg-amber-500 text-zinc-950 shadow-sm'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>🏟️ Cancha</span>
                  </button>
                </div>

                {/* Lista Horizontal de Chips interactivos de 1 tap */}
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                  {(categoriaChipChat === 'tacticos'
                    ? CHIPS_TACTICOS
                    : categoriaChipChat === 'horarios'
                    ? CHIPS_CHAT_CONTRAPROPUESTA.filter((c) => c.includes('⏰') || c.includes('📅') || c.includes('🌙') || c.includes('hs'))
                    : CHIPS_CHAT_CONTRAPROPUESTA.filter((c) => c.includes('cancha') || c.includes('F7'))
                  ).map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleEnviarMensajeChat(chip)}
                      disabled={enviandoMensaje}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700/80 active:scale-95 transition shadow-sm cursor-pointer whitespace-nowrap"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Input de texto para ping libre con botón Enviar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleEnviarMensajeChat();
                  }}
                  className="flex gap-2 mt-2 pt-2 border-t border-zinc-800/80"
                >
                  <input
                    type="text"
                    maxLength={160}
                    placeholder="Escribí un ping o tocá un chip..."
                    value={textoMensajeChat}
                    onChange={(e) => setTextoMensajeChat(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-700/90 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 placeholder:text-zinc-500 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={enviandoMensaje || !textoMensajeChat.trim()}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center transition disabled:opacity-50 cursor-pointer shadow-sm active:scale-95"
                  >
                    {enviandoMensaje ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </div>
            )}

            {/* Barra de Acciones del Desafío: Pactar o Rechazar */}
            <div className="mt-3 pt-2.5 border-t border-zinc-800 flex items-center gap-2">
              {yaEstaPactado ? (
                <button
                  type="button"
                  onClick={() => {
                    onCerrar();
                    navigate('/equipo');
                  }}
                  className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] cursor-pointer active:scale-95 transition"
                >
                  <CheckCheck className="w-4 h-4" />
                  Ver Partido en Convocatoria de Mi Equipo
                </button>
              ) : estaRechazado ? (
                <div className="w-full text-center py-2 text-zinc-500 text-xs font-bold">
                  Este desafío fue finalizado o rechazado.
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleRechazarDesafio}
                    disabled={procesandoPacto}
                    className="w-1/3 py-2.5 rounded-xl bg-zinc-900 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-zinc-800 font-bold text-xs transition cursor-pointer"
                  >
                    Descartar
                  </button>

                  <button
                    type="button"
                    onClick={handlePactarPartido}
                    disabled={procesandoPacto}
                    className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-95 transition cursor-pointer"
                  >
                    {procesandoPacto ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        Pactar Partido (Cerrar Acuerdo)
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* MODO B: FORMULARIO INICIAL CON CHIPS (PRIMER DESAFÍO)    */
          /* ======================================================== */
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {cargandoInicial ? (
              <div className="flex items-center justify-center py-8 text-zinc-400 text-xs font-bold">
                <Loader2 className="w-4 h-4 animate-spin mr-2 text-amber-500" />
                Cargando equipos...
              </div>
            ) : misEquipos.length === 0 ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center my-4">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-xs text-red-200 font-bold mb-1">No tenés ningún equipo creado</p>
                <p className="text-[11px] text-zinc-400">
                  Para desafiar a otros equipos necesitás ser capitán o integrar un equipo en Fulbeando.
                </p>
              </div>
            ) : (
              <>
                {/* Selector de Mi Equipo si tiene más de 1 */}
                {misEquipos.length > 1 && (
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      ¿Con qué equipo desafiás?
                    </label>
                    <select
                      value={equipoSeleccionadoId}
                      onChange={(e) => setEquipoSeleccionadoId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                    >
                      {misEquipos.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name || eq.nombre} {eq.captainId === usuarioActual.uid ? '👑 (Capitán)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Modalidad de Juego (Chips) */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Modalidad de Juego
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['F5', 'F7', 'F8', 'F11'] as ModalidadDesafio[]).map((mod) => (
                      <button
                        key={mod}
                        type="button"
                        onClick={() => setModalidad(mod)}
                        className={`py-2 rounded-xl text-xs font-black transition active:scale-95 border cursor-pointer ${
                          modalidad === mod
                            ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        {mod}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Día y Horario Sugerido (Chips) */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> Día y Horario sugerido
                    </span>
                    <button
                      type="button"
                      onClick={() => setUsarPersonalizado(!usarPersonalizado)}
                      className="text-amber-400 hover:underline text-[10px] font-bold cursor-pointer"
                    >
                      {usarPersonalizado ? 'Ver sugerencias rápidas' : 'Personalizar'}
                    </button>
                  </label>

                  {!usarPersonalizado ? (
                    <div className="flex flex-wrap gap-1.5">
                      {CHIPS_HORARIOS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setHorarioSeleccionado(chip)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 border cursor-pointer ${
                            horarioSeleccionado === chip
                              ? 'bg-amber-500/25 border-amber-500 text-amber-300 shadow-sm'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ej: Sábado a las 20:30 hs"
                      value={horarioPersonalizado}
                      onChange={(e) => setHorarioPersonalizado(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 placeholder:text-zinc-600"
                    />
                  )}
                </div>

                {/* Cancha / Predio (Chips) */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" /> Cancha / Lugar
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setCanchaOpcion('busca_cancha')}
                      className={`p-2.5 rounded-xl text-left border transition text-xs cursor-pointer ${
                        canchaOpcion === 'busca_cancha'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-sm'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="font-bold block text-xs">⚽ A medias</span>
                      <span className="text-[10px] text-zinc-500 block">Buscamos cancha juntos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCanchaOpcion('con_cancha')}
                      className={`p-2.5 rounded-xl text-left border transition text-xs cursor-pointer ${
                        canchaOpcion === 'con_cancha'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="font-bold block text-xs">🟢 Ya tenemos</span>
                      <span className="text-[10px] text-zinc-500 block">Ponemos la cancha</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCanchaOpcion('rival_propone')}
                      className={`p-2.5 rounded-xl text-left border transition text-xs cursor-pointer ${
                        canchaOpcion === 'rival_propone'
                          ? 'bg-blue-500/15 border-blue-500 text-blue-300 shadow-sm'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="font-bold block text-xs">🤝 El rival elige</span>
                      <span className="text-[10px] text-zinc-500 block">Jugar de visitante</span>
                    </button>
                  </div>

                  {canchaOpcion === 'con_cancha' && (
                    <input
                      type="text"
                      placeholder="Nombre del complejo o cancha (ej. Complejo El Sol)"
                      value={predioNombre}
                      onChange={(e) => setPredioNombre(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 placeholder:text-zinc-600 mt-1"
                    />
                  )}
                </div>

                {/* Ping Táctico Inicial (Chips) */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Ping Táctico Inicial (Primer mensaje)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {CHIPS_TACTICOS.slice(0, 4).map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setPingSeleccionado(chip);
                          setPingLibre('');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition active:scale-95 border cursor-pointer ${
                          pingSeleccionado === chip && !pingLibre
                            ? 'bg-amber-500/25 border-amber-500 text-amber-300 shadow-sm'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    maxLength={160}
                    placeholder="O escribí un ping breve personalizado..."
                    value={pingLibre}
                    onChange={(e) => setPingLibre(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 placeholder:text-zinc-600 font-medium"
                  />
                </div>

                {/* Botón de Lanzar Desafío & Abrir Chat */}
                <div className="pt-2 border-t border-zinc-800 flex gap-2">
                  <button
                    type="button"
                    onClick={onCerrar}
                    className="w-1/3 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleCrearDesafioInicial}
                    disabled={enviandoMensaje || misEquipos.length === 0}
                    className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] active:scale-95 transition disabled:opacity-50 cursor-pointer"
                  >
                    {enviandoMensaje ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Lanzar Desafío & Abrir Chat
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Mensaje de Error */}
        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

      </div>
    </div>
  );
};
