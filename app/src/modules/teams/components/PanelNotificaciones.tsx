import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Bell,
  Shield,
  Check,
  Trophy,
  Swords,
  MessageSquare,
  Loader2,
  User,
  ExternalLink,
} from 'lucide-react';
import {
  responderInvitacion,
  responderDesafioEquipo,
  unirseAEquipo,
  marcarNotificacionComoLeida,
  incorporarRefuerzoAEquipo,
  notificarResolucionPostulacion,
  type InvitacionEquipo,
} from '@/modules/teams/teamService';
import { confirmarSuplente, rechazarSuplente } from '@/modules/alertas/repositorio';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer';

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

  const notificacionesFiltradas = React.useMemo(() => {
    const vistos = new Set<string>();
    return notificaciones.filter((n) => {
      const clave = n.desafioId || n.pactoPartido?.id || n.id;
      if (vistos.has(clave)) return false;
      vistos.add(clave);

      if (filtro === 'pendientes') return n.estado === 'pendiente';
      if (filtro === 'equipos') return n.tipo === 'invitacion_equipo';
      if (filtro === 'partidos') {
        return (
          n.tipo === 'desafio_equipo' ||
          n.tipo === 'desafio_aviso_miembro' ||
          n.tipo === 'desafio_aceptado' ||
          n.tipo === 'postulacion_partido' ||
          n.tipo === 'postulacion_aceptada' ||
          n.tipo === 'postulacion_rechazada'
        );
      }
      return true;
    });
  }, [notificaciones, filtro]);

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
      const suplenteUid = notif.remitenteUid;
      if (notif.equipoId) {
        await incorporarRefuerzoAEquipo(notif.equipoId, {
          uid: suplenteUid,
          nombre: notif.remitenteNombre || 'Jugador',
          posicion: notif.posicion,
        }).catch((err) => console.warn('Error incorporando refuerzo al equipo:', err));
      } else if (notif.alertaId) {
        await confirmarSuplente(notif.alertaId, suplenteUid).catch((e) =>
          console.warn('Alerta ya confirmada o completada:', e),
        );
      }
      await responderInvitacion(notif.id, 'aceptada');
      if (suplenteUid) {
        await notificarResolucionPostulacion({
          jugadorUid: suplenteUid,
          jugadorNombre: notif.remitenteNombre,
          capitanUid: usuarioUid,
          capitanNombre: notif.destinatarioNombre || 'El Capitán',
          equipoId: notif.equipoId,
          equipoNombre: notif.equipoNombre || 'Partido',
          partidoId: notif.desafioId || notif.alertaId,
          alertaId: notif.alertaId,
          resultado: 'aceptada',
        }).catch(console.warn);
      }
      setFeedback(`¡Sumaste a ${notif.remitenteNombre || 'jugador'} como refuerzo para el partido! ⚽`);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      console.error(err);
      setFeedback(err?.message || 'Error al aceptar');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazarSuplente = async (notif: InvitacionEquipo) => {
    setProcesandoId(notif.id);
    try {
      const alertaId = notif.alertaId || notif.desafioId;
      const suplenteUid = notif.remitenteUid;
      if (alertaId && suplenteUid) {
        await rechazarSuplente(alertaId, suplenteUid).catch(console.warn);
      }
      await responderInvitacion(notif.id, 'rechazada');
      if (suplenteUid) {
        await notificarResolucionPostulacion({
          jugadorUid: suplenteUid,
          jugadorNombre: notif.remitenteNombre,
          capitanUid: usuarioUid,
          capitanNombre: notif.destinatarioNombre || 'El Capitán',
          equipoId: notif.equipoId,
          equipoNombre: notif.equipoNombre || 'Partido',
          partidoId: notif.desafioId || notif.alertaId,
          alertaId,
          resultado: 'rechazada',
        }).catch(console.warn);
      }
      setFeedback('Postulación rechazada');
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleAceptarRefuerzo = async (notif: InvitacionEquipo) => {
    setProcesandoId(notif.id);
    try {
      const nombreEmisor = notif.remitenteNombre || notif.capitanNombre || 'Jugador';
      if (notif.equipoId) {
        await incorporarRefuerzoAEquipo(notif.equipoId, {
          uid: notif.remitenteUid,
          nombre: nombreEmisor,
        }).catch((err) => console.warn('Error incorporando refuerzo al equipo:', err));
      }
      await responderInvitacion(notif.id, 'aceptada');
      if (notif.remitenteUid) {
        await notificarResolucionPostulacion({
          jugadorUid: notif.remitenteUid,
          jugadorNombre: nombreEmisor,
          capitanUid: usuarioUid,
          capitanNombre: notif.destinatarioNombre || 'El Capitán',
          equipoId: notif.equipoId,
          equipoNombre: notif.equipoNombre,
          equipoEscudoUrl: notif.equipoEscudoUrl,
          partidoId: notif.desafioId || notif.equipoId,
          resultado: 'aceptada',
        }).catch(console.warn);
      }
      setFeedback(`¡Sumaste a ${nombreEmisor} como refuerzo para el partido! ⚽`);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      console.error(err);
      setFeedback(err?.message || 'Error al aceptar refuerzo');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazarRefuerzo = async (notif: InvitacionEquipo) => {
    setProcesandoId(notif.id);
    try {
      await responderInvitacion(notif.id, 'rechazada');
      if (notif.remitenteUid) {
        await notificarResolucionPostulacion({
          jugadorUid: notif.remitenteUid,
          jugadorNombre: notif.remitenteNombre,
          capitanUid: usuarioUid,
          capitanNombre: notif.destinatarioNombre || 'El Capitán',
          equipoId: notif.equipoId,
          equipoNombre: notif.equipoNombre,
          partidoId: notif.desafioId || notif.equipoId,
          resultado: 'rechazada',
        }).catch(console.warn);
      }
      setFeedback('Postulación descartada');
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleVerFicha = (uid: string) => {
    onCerrar();
    navigate(`/carta/${uid}`);
  };

  const handleAbrirChat = (notif: InvitacionEquipo) => {
    onCerrar();
    onAbrirChatDesafio?.(notif);
  };

  return (
    <Drawer open={abierto} onOpenChange={(open) => !open && onCerrar()}>
      <DrawerContent className="p-5 sm:p-6 pb-8 min-h-[580px] max-h-[92vh] md:max-w-lg md:mx-auto">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Notificaciones</DrawerTitle>
          <DrawerDescription>Invitaciones a equipos, pactos y avisos de partido</DrawerDescription>
        </DrawerHeader>
        
        {/* Botón Cerrar */}
        <DrawerClose asChild>
          <button
            onClick={onCerrar}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700/80 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer z-10"
            aria-label="Cerrar panel de notificaciones"
          >
            <X className="w-5 h-5" />
          </button>
        </DrawerClose>

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
          <div className="bg-emerald-500 text-zinc-950 font-black text-xs px-3.5 py-2 rounded-xl mt-3 flex items-center justify-between shadow-md animate-slide-up">
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
                    {/* Icono temático / Avatar clickeable para ver ficha */}
                    <button
                      type="button"
                      disabled={!notif.remitenteUid}
                      onClick={() => notif.remitenteUid && handleVerFicha(notif.remitenteUid)}
                      title={notif.remitenteUid ? 'Click para ver ficha de jugador' : undefined}
                      className={`w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${
                        notif.remitenteUid ? 'cursor-pointer hover:border-amber-400 hover:scale-105 active:scale-95 transition' : ''
                      }`}
                    >
                      {notif.equipoEscudoUrl ? (
                        <img src={notif.equipoEscudoUrl} alt={notif.equipoNombre} className="w-full h-full object-cover" />
                      ) : tipo === 'desafio_equipo' ? (
                        <Swords className="w-5 h-5 text-amber-400" />
                      ) : tipo === 'desafio_aceptado' ? (
                        <Trophy className="w-5 h-5 text-emerald-400" />
                      ) : tipo === 'postulacion_partido' ? (
                        <span className="text-lg">🏃</span>
                      ) : tipo === 'postulacion_aceptada' ? (
                        <Trophy className="w-5 h-5 text-emerald-400" />
                      ) : tipo === 'postulacion_rechazada' ? (
                        <span className="text-lg">⚠️</span>
                      ) : (
                        <Shield className="w-5 h-5 text-amber-500" />
                      )}
                    </button>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 truncate">
                          {tipo === 'desafio_equipo'
                            ? '⚽ Desafío de Partido'
                            : tipo === 'desafio_aviso_miembro'
                            ? '⚽ Desafío para tu Equipo'
                            : tipo === 'desafio_aceptado'
                            ? '🏆 Desafío Aceptado'
                            : tipo === 'postulacion_partido'
                            ? '🏃 Nuevo Suplente'
                            : tipo === 'postulacion_aceptada'
                            ? '🎉 ¡Confirmado en Partido!'
                            : tipo === 'postulacion_rechazada'
                            ? '⚠️ Cupo Completo'
                            : tipo === 'convocatoria_partido'
                            ? '⚽ Nueva Convocatoria'
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
                          tipo === 'desafio_equipo' || tipo === 'desafio_aviso_miembro'
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
                        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-zinc-800">
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
                              {notif.remitenteUid && (
                                <button
                                  type="button"
                                  onClick={() => handleVerFicha(notif.remitenteUid)}
                                  className="px-2.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-amber-400 font-bold text-xs flex items-center gap-1 transition cursor-pointer border border-zinc-700/60"
                                >
                                  <User className="w-3.5 h-3.5" />
                                  Ver Perfil
                                </button>
                              )}
                            </>
                          )}

                          {(tipo === 'desafio_equipo' || tipo === 'desafio_aviso_miembro') && (
                            <>
                              {onAbrirChatDesafio && (
                                <button
                                  type="button"
                                  onClick={() => handleAbrirChat(notif)}
                                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 hover:text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition cursor-pointer border border-zinc-700"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  {tipo === 'desafio_aviso_miembro' ? 'Ver Chat & Desafío' : 'Abrir Chat & Chips'}
                                </button>
                              )}
                              {tipo === 'desafio_equipo' && !notif.esAvisoMiembro && (
                                <>
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
                              {notif.remitenteUid && (
                                <button
                                  type="button"
                                  onClick={() => handleVerFicha(notif.remitenteUid)}
                                  className="px-2.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer border border-zinc-700/60"
                                >
                                  <User className="w-3.5 h-3.5 text-amber-400" />
                                  Ver Rival
                                </button>
                              )}
                            </>
                          )}

                          {/* Jugador que aceptó el desafío / se anotó como refuerzo */}
                          {tipo === 'desafio_aceptado' && (
                            <>
                              <button
                                type="button"
                                disabled={procesandoId === notif.id}
                                onClick={() => handleAceptarRefuerzo(notif)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center gap-1 active:scale-95 transition cursor-pointer shadow-sm"
                              >
                                {procesandoId === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Aceptar Refuerzo
                              </button>
                              <button
                                type="button"
                                disabled={procesandoId === notif.id}
                                onClick={() => handleRechazarRefuerzo(notif)}
                                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold text-xs transition cursor-pointer"
                              >
                                Rechazar
                              </button>
                              {notif.remitenteUid && (
                                <button
                                  type="button"
                                  onClick={() => handleVerFicha(notif.remitenteUid)}
                                  className="px-2.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-amber-400 font-bold text-xs flex items-center gap-1 transition cursor-pointer border border-zinc-700/60"
                                >
                                  <User className="w-3.5 h-3.5" />
                                  Ver Ficha
                                </button>
                              )}
                              {onAbrirChatDesafio && (
                                <button
                                  type="button"
                                  onClick={() => handleAbrirChat(notif)}
                                  className="px-2.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer border border-zinc-700/60"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                                  Chat
                                </button>
                              )}
                            </>
                          )}

                          {/* Postulación a partido / Alerta Falta 1 */}
                          {tipo === 'postulacion_partido' && (
                            <>
                              <button
                                type="button"
                                disabled={procesandoId === notif.id}
                                onClick={() => handleAceptarSuplente(notif)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center gap-1 active:scale-95 transition cursor-pointer shadow-sm"
                              >
                                {procesandoId === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Confirmar Suplente
                              </button>
                              <button
                                type="button"
                                disabled={procesandoId === notif.id}
                                onClick={() => handleRechazarSuplente(notif)}
                                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold text-xs transition cursor-pointer"
                              >
                                Rechazar
                              </button>
                              {notif.remitenteUid && (
                                <button
                                  type="button"
                                  onClick={() => handleVerFicha(notif.remitenteUid)}
                                  className="px-2.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-amber-400 font-bold text-xs flex items-center gap-1 transition cursor-pointer border border-zinc-700/60"
                                >
                                  <User className="w-3.5 h-3.5" />
                                  Ver Ficha
                                </button>
                              )}
                            </>
                          )}

                          {/* El jugador fue confirmado para el partido */}
                          {tipo === 'postulacion_aceptada' && (
                            <>
                              <button
                                type="button"
                                disabled={procesandoId === notif.id}
                                onClick={async () => {
                                  setProcesandoId(notif.id);
                                  await responderInvitacion(notif.id, 'aceptada');
                                  setProcesandoId(null);
                                  setFeedback('¡A preparar los botines! ⚽');
                                  setTimeout(() => setFeedback(null), 3500);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center gap-1 active:scale-95 transition cursor-pointer shadow-sm"
                              >
                                {procesandoId === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                ¡A jugar!
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onCerrar();
                                  navigate('/partidos');
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-amber-400 font-bold text-xs flex items-center gap-1 transition cursor-pointer border border-zinc-700/60"
                              >
                                Ver Convocatoria
                              </button>
                            </>
                          )}

                          {/* Notificación de cupo completado */}
                          {tipo === 'postulacion_rechazada' && (
                            <>
                              <button
                                type="button"
                                disabled={procesandoId === notif.id}
                                onClick={async () => {
                                  setProcesandoId(notif.id);
                                  await responderInvitacion(notif.id, 'aceptada');
                                  setProcesandoId(null);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs flex items-center gap-1 transition cursor-pointer border border-zinc-700"
                              >
                                Entendido
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onCerrar();
                                  navigate('/radar');
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1 transition cursor-pointer shadow-sm"
                              >
                                Buscar otro partido ⚽
                              </button>
                            </>
                          )}

                          {/* Nueva Convocatoria de Partido */}
                          {tipo === 'convocatoria_partido' && (
                            <>
                              <button
                                type="button"
                                disabled={procesandoId === notif.id}
                                onClick={async () => {
                                  setProcesandoId(notif.id);
                                  await responderInvitacion(notif.id, 'aceptada');
                                  setNotificaciones((prev) => prev.filter((n) => n.id !== notif.id));
                                  setProcesandoId(null);
                                  onCerrar();
                                  navigate('/equipo');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1 active:scale-95 transition cursor-pointer shadow-sm"
                              >
                                {procesandoId === notif.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>⚽ Ver Convocatoria y Votar</span>}
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Botones secundarios para notificaciones ya resueltas */}
                      {!esPendiente && (notif.remitenteUid || onAbrirChatDesafio) && (
                        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-zinc-800/60">
                          {notif.remitenteUid && (
                            <button
                              type="button"
                              onClick={() => handleVerFicha(notif.remitenteUid)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800/70 hover:bg-zinc-700 text-amber-400 text-xs font-bold flex items-center gap-1 transition cursor-pointer border border-zinc-700/60"
                            >
                              <User className="w-3 h-3" />
                              Ver Ficha de Jugador
                            </button>
                          )}
                          {onAbrirChatDesafio && (tipo === 'desafio_equipo' || tipo === 'desafio_aviso_miembro') && (
                            <button
                              type="button"
                              onClick={() => handleAbrirChat(notif)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800/70 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer border border-zinc-700/60"
                            >
                              <MessageSquare className="w-3 h-3 text-amber-400" />
                              Abrir Conversación
                            </button>
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
      </DrawerContent>
    </Drawer>
  );
};
