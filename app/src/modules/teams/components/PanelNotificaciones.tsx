import React, { useState } from 'react';
import {
  X,
  Bell,
  Shield,
  Clock,
  Check,
  Trophy,
  UserPlus,
  Swords,
  Radio,
  CheckCheck,
  MessageSquare,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  responderInvitacion,
  responderDesafioEquipo,
  unirseAEquipo,
  marcarNotificacionComoLeida,
  type InvitacionEquipo,
} from '@/modules/teams/teamService';
import { confirmarSuplente, rechazarSuplente } from '@/modules/alertas/repositorio';

interface PanelNotificacionesProps {
  abierto: boolean;
  onCerrar: () => void;
  usuarioUid: string;
  notificaciones: InvitacionEquipo[];
  onAbrirChatDesafio?: (desafio: InvitacionEquipo) => void;
}

export const PanelNotificaciones: React.FC<PanelNotificacionesProps> = ({
  abierto,
  onCerrar,
  usuarioUid,
  notificaciones,
  onAbrirChatDesafio,
}) => {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<'todas' | 'pendientes' | 'equipos' | 'partidos'>('todas');
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!abierto) return null;

  const notificacionesFiltradas = notificaciones.filter((n) => {
    if (filtro === 'pendientes') return n.estado === 'pendiente';
    if (filtro === 'equipos') return n.tipo === 'invitacion_equipo';
    if (filtro === 'partidos') return n.tipo === 'desafio_equipo' || n.tipo === 'desafio_aceptado' || n.tipo === 'postulacion_partido';
    return true;
  });

  const noLeidas = notificaciones.filter((n) => !n.leida);

  const handleMarcarTodasLeidas = async () => {
    for (const n of noLeidas) {
      await marcarNotificacionComoLeida(n.id);
    }
  };

  const handleAceptarInvitacionEquipo = async (notif: InvitacionEquipo) => {
    setProcesandoId(notif.id);
    try {
      await unirseAEquipo(notif.equipoId, usuarioUid);
      await responderInvitacion(notif.id, 'aceptada');
      setFeedback(`¡Te uniste a ${notif.equipoNombre}! ⚽`);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      console.error(err);
      setFeedback(err?.message || 'Error al unirse al equipo');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazarInvitacionEquipo = async (notif: InvitacionEquipo) => {
    setProcesandoId(notif.id);
    try {
      await responderInvitacion(notif.id, 'rechazada');
    } catch (err) {
      console.error(err);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleAceptarDesafio = async (notif: InvitacionEquipo) => {
    setProcesandoId(notif.id);
    try {
      await responderDesafioEquipo(notif.id, 'pactado');
      setFeedback(`¡Partido pactado contra ${notif.equipoNombre}! ⚽ Agendado en Mi Equipo`);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      console.error(err);
      setFeedback(err?.message || 'Error al pactar partido');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazarDesafio = async (notif: InvitacionEquipo) => {
    setProcesandoId(notif.id);
    try {
      await responderDesafioEquipo(notif.id, 'rechazado');
    } catch (err) {
      console.error(err);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleAceptarSuplente = async (notif: InvitacionEquipo) => {
    setProcesandoId(notif.id);
    try {
      await confirmarSuplente(notif.id, usuarioUid);
      await responderInvitacion(notif.id, 'aceptada');
      setFeedback('¡Suplente confirmado para el partido!');
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazarSuplente = async (notif: InvitacionEquipo) => {
    setProcesandoId(notif.id);
    try {
      await rechazarSuplente(notif.id, usuarioUid);
      await responderInvitacion(notif.id, 'rechazada');
    } catch (err) {
      console.error(err);
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0B0F19] border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-left my-auto flex flex-col max-h-[88vh] overflow-hidden">
        
        {/* Botón Cerrar */}
        <button
          onClick={onCerrar}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700/80 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer z-10"
          aria-label="Cerrar panel de notificaciones"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 pr-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Notificaciones
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                Invitaciones, desafíos y avisos de partido
              </p>
            </div>
          </div>

          {noLeidas.length > 0 && (
            <button
              onClick={handleMarcarTodasLeidas}
              className="text-[11px] text-amber-400 hover:text-white font-bold underline cursor-pointer shrink-0 ml-2"
            >
              Marcar leídas
            </button>
          )}
        </div>

        {/* Feedback Toast */}
        {feedback && (
          <div className="bg-emerald-500 text-zinc-950 font-black text-xs px-3.5 py-2 rounded-xl mt-3 flex items-center justify-between animate-bounce">
            <span>{feedback}</span>
          </div>
        )}

        {/* Pestañas de Filtro */}
        <div className="flex gap-1.5 my-3 pb-1 border-b border-zinc-800/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFiltro('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              filtro === 'todas'
                ? 'bg-amber-500 text-zinc-950 font-black shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Todas ({notificaciones.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltro('pendientes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              filtro === 'pendientes'
                ? 'bg-amber-500 text-zinc-950 font-black shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Pendientes ({notificaciones.filter((n) => n.estado === 'pendiente').length})
          </button>
          <button
            type="button"
            onClick={() => setFiltro('equipos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              filtro === 'equipos'
                ? 'bg-amber-500 text-zinc-950 font-black shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Equipos 🛡️
          </button>
          <button
            type="button"
            onClick={() => setFiltro('partidos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              filtro === 'partidos'
                ? 'bg-amber-500 text-zinc-950 font-black shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Partidos ⚽
          </button>
        </div>

        {/* Lista de Notificaciones */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {notificacionesFiltradas.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto mb-3 text-2xl">
                🔔
              </div>
              <h4 className="text-white font-black text-sm mb-1">No hay notificaciones</h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                Cuando recibas invitaciones de equipos o desafíos de otros capitanes, vas a verlas acá.
              </p>
            </div>
          ) : (
            notificacionesFiltradas.map((notif) => {
              const tipo = notif.tipo || 'invitacion_equipo';
              const emisor = notif.remitenteNombre || notif.capitanNombre || 'Un jugador';
              const esPendiente = notif.estado === 'pendiente';
              const pacto = notif.pactoPartido;

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    !notif.leida
                      ? 'bg-zinc-900/95 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'bg-zinc-900/60 border-zinc-800/90'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icono temático */}
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                      {notif.equipoEscudoUrl ? (
                        <img src={notif.equipoEscudoUrl} alt={notif.equipoNombre} className="w-full h-full object-cover" />
                      ) : tipo === 'desafio_equipo' ? (
                        <Swords className="w-5 h-5 text-amber-400" />
                      ) : tipo === 'desafio_aceptado' ? (
                        <Trophy className="w-5 h-5 text-emerald-400" />
                      ) : tipo === 'postulacion_partido' ? (
                        <span className="text-lg">🏃</span>
                      ) : (
                        <Shield className="w-5 h-5 text-amber-500" />
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 truncate">
                          {tipo === 'desafio_equipo'
                            ? '⚽ Desafío de Partido'
                            : tipo === 'desafio_aceptado'
                            ? '🏆 Desafío Aceptado'
                            : tipo === 'postulacion_partido'
                            ? '🏃 Nuevo Suplente'
                            : '🛡️ Invitación a Plantel'}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            notif.estado === 'aceptada'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                              : notif.estado === 'rechazada'
                              ? 'bg-red-500/20 text-red-300 border-red-500/50'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          }`}
                        >
                          {notif.estado === 'aceptada' ? 'Aceptada' : notif.estado === 'rechazada' ? 'Rechazada' : 'Pendiente'}
                        </span>
                      </div>

                      <p className="text-xs text-white font-bold leading-snug mb-1">
                        {notif.mensaje || (
                          tipo === 'desafio_equipo'
                            ? `${notif.equipoNombre} desafió a tu equipo a un partido.`
                            : `${emisor} te invitó a unirte a ${notif.equipoNombre}.`
                        )}
                      </p>

                      {pacto && (
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1 mb-1.5">
                          <span className="font-bold text-amber-400">{pacto.modalidad}</span>
                          <span>•</span>
                          <span className="truncate">{pacto.fechaTentativa}</span>
                        </div>
                      )}

                      {/* Botones de acción si la notificación está pendiente */}
                      {esPendiente && (
                        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-zinc-800">
                          {tipo === 'invitacion_equipo' && (
                            <>
                              <button
                                type="button"
                                disabled={procesandoId === notif.id}
                                onClick={() => handleAceptarInvitacionEquipo(notif)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center gap-1 active:scale-95 transition cursor-pointer shadow-sm"
                              >
                                {procesandoId === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Aceptar
                              </button>
                              <button
                                type="button"
                                disabled={procesandoId === notif.id}
                                onClick={() => handleRechazarInvitacionEquipo(notif)}
                                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold text-xs transition cursor-pointer"
                              >
                                Rechazar
                              </button>
                            </>
                          )}

                          {tipo === 'desafio_equipo' && (
                            <>
                              {onAbrirChatDesafio && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onCerrar();
                                    onAbrirChatDesafio(notif);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 hover:text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition cursor-pointer border border-zinc-700"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  Abrir Chat & Chips
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={procesandoId === notif.id}
                                onClick={() => handleAceptarDesafio(notif)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center gap-1 active:scale-95 transition cursor-pointer shadow-sm"
                              >
                                {procesandoId === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Pactar
                              </button>
                              <button
                                type="button"
                                disabled={procesandoId === notif.id}
                                onClick={() => handleRechazarDesafio(notif)}
                                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold text-xs transition cursor-pointer"
                              >
                                Rechazar
                              </button>
                            </>
                          )}

                          {tipo === 'postulacion_partido' && (
                            <>
                              <button
                                type="button"
                                disabled={procesandoId === notif.id}
                                onClick={() => handleAceptarSuplente(notif)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center gap-1 active:scale-95 transition cursor-pointer shadow-sm"
                              >
                                {procesandoId === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Confirmar
                              </button>
                              <button
                                type="button"
                                disabled={procesandoId === notif.id}
                                onClick={() => handleRechazarSuplente(notif)}
                                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold text-xs transition cursor-pointer"
                              >
                                Rechazar
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
