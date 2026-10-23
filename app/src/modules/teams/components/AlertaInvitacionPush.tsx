import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Shield, Check, X, Loader2, Trophy, UserPlus, Swords, Clock, MapPin, MessageSquareQuote, ArrowRightLeft } from 'lucide-react';
import { useSesion } from '@/modules/auth/useSesion';
import {
  escucharInvitacionesPendientes,
  responderInvitacion,
  responderDesafioEquipo,
  unirseAEquipo,
  incorporarRefuerzoAEquipo,
  abrirChatDesafio,
  marcarDesafioComoLeido,
  type InvitacionEquipo,
} from '@/modules/teams/teamService';
import { confirmarSuplente, rechazarSuplente } from '@/modules/alertas/repositorio';
import { dispararNotificacionPushLocal } from '@/modules/notifications/pushService';
import { Toast } from '@/modules/ui/overlays';

const CHIPS_CONTRAOFERTA = [
  'Preferimos 30 min más tarde ⏰',
  'Nos queda mejor el Sábado 📅',
  'Tenemos cancha nosotros 🟢',
  '¿Se puede pasar a F7? ⚽',
];

export const AlertaInvitacionPush: React.FC = () => {
  const sesion = useSesion();
  const navigate = useNavigate();
  const [invitaciones, setInvitaciones] = useState<InvitacionEquipo[]>([]);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [toastExito, setToastExito] = useState<string | null>(null);
  const [modoContraoferta, setModoContraoferta] = useState(false);
  const [contraofertaSeleccionada, setContraofertaSeleccionada] = useState(CHIPS_CONTRAOFERTA[0]);
  const [cerradasIds, setCerradasIds] = useState<Set<string>>(new Set());

  // Registro de notificaciones ya disparadas para evitar loops y spam al recargar o al chatear
  const notificadosRef = useRef<Set<string>>(new Set());
  const primeraCargaRef = useRef<boolean>(true);

  useEffect(() => {
    if (!sesion.user) {
      setInvitaciones([]);
      return;
    }

    const unsub = escucharInvitacionesPendientes(sesion.user.uid, (listaRaw) => {
      // Deduplicar invitaciones recibidas por id de desafío para evitar modales apilados idénticos
      const mapa = new Map<string, InvitacionEquipo>();
      for (const inv of listaRaw) {
        const clave = inv.desafioId || inv.pactoPartido?.id || inv.id;
        if (!mapa.has(clave)) {
          mapa.set(clave, inv);
        }
      }
      const lista = Array.from(mapa.values());

      if (primeraCargaRef.current) {
        // En la primera carga, registrar los IDs existentes para no disparar spam push al entrar o recargar
        lista.forEach((inv) => {
          const ultimoPingTime = inv.pactoPartido?.pingsTacticos?.slice(-1)[0]?.fecha || 0;
          notificadosRef.current.add(`${inv.id}_${ultimoPingTime}`);
        });
        primeraCargaRef.current = false;
        setInvitaciones(lista);
        return;
      }

      // En actualizaciones posteriores, verificar si hay una nueva notificación entrante dirigida al usuario
      for (const inv of lista) {
        // No notificar al propio usuario por sus propias acciones
        if (inv.remitenteUid === sesion.user.uid) continue;

        const ultimoPing = inv.pactoPartido?.pingsTacticos?.slice(-1)[0];
        const ultimoPingTime = ultimoPing?.fecha || 0;
        const claveNotif = `${inv.id}_${ultimoPingTime}`;

        // Si ya notificamos esta versión o el último mensaje fue del propio usuario, omitir
        if (notificadosRef.current.has(claveNotif)) continue;
        if (ultimoPing && ultimoPing.emisorUid === sesion.user.uid) {
          notificadosRef.current.add(claveNotif);
          continue;
        }

        notificadosRef.current.add(claveNotif);

        // Si llegó un nuevo ping o actualización del rival, permitir que vuelva a mostrarse
        setCerradasIds((prev) => {
          if (!prev.has(inv.id)) return prev;
          const next = new Set(prev);
          next.delete(inv.id);
          if (inv.desafioId) next.delete(inv.desafioId);
          return next;
        });

        const nombreEmisor = inv.remitenteNombre || inv.capitanNombre || 'Un jugador';
        let tituloNotif = '¡Alerta de Partido en Fulbeando!';
        let cuerpoNotif = `${nombreEmisor} te envió una notificación.`;

        if (inv.tipo === 'desafio_equipo' || inv.tipo === 'desafio_aviso_miembro') {
          tituloNotif = ultimoPing ? `💬 Nuevo ping de ${ultimoPing.emisorNombre || 'Rival'}` : '¡Desafío de Partido! ⚽';
          cuerpoNotif = ultimoPing ? ultimoPing.texto : (inv.mensaje || `${inv.equipoNombre} desafió a tu equipo a un partido.`);
        } else if (inv.tipo === 'desafio_aceptado') {
          tituloNotif = '¡Aceptaron tu desafío de partido! ⚽';
          cuerpoNotif = inv.mensaje || `${nombreEmisor} aceptó el desafío para jugar con ${inv.equipoNombre}.`;
        } else if (inv.tipo === 'postulacion_partido') {
          tituloNotif = '¡Nuevo jugador para tu partido! 🏃';
          cuerpoNotif = inv.mensaje || `${nombreEmisor} quiere sumarse como suplente ese día.`;
        } else {
          tituloNotif = '¡Te invitaron a un equipo en Fulbeando!';
          cuerpoNotif = `${nombreEmisor} te invitó a unirte a ${inv.equipoNombre}. ¡Entrá a responder!`;
        }

        dispararNotificacionPushLocal(tituloNotif, {
          body: cuerpoNotif,
          icon: inv.equipoEscudoUrl || '/pwa-192x192.png',
        });
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.([120, 80, 120]);
        }
        break; // Notificar 1 por snapshot
      }

      setInvitaciones(lista);
    });

    return () => unsub();
  }, [sesion.user]);

  const invitacionesVisibles = invitaciones.filter(
    (inv) => !cerradasIds.has(inv.id) && !cerradasIds.has(inv.desafioId || '')
  );
  const invitacionActual = invitacionesVisibles[0];

  const handleCerrar = () => {
    const target = invitacionActual;
    if (!target) return;
    const idRaiz = target.desafioId || target.pactoPartido?.id || target.id;
    setCerradasIds((prev) => {
      const next = new Set(prev);
      next.add(target.id);
      next.add(idRaiz);
      return next;
    });
    setModoContraoferta(false);
    marcarDesafioComoLeido(target.id).catch(() => {});
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && invitacionActual) {
        handleCerrar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [invitacionActual]);

  if (!sesion.user || !invitacionActual) {
    return <Toast mensaje={toastExito} />;
  }

  const tipo = invitacionActual.tipo || 'invitacion_equipo';
  const nombreEmisor = invitacionActual.remitenteNombre || invitacionActual.capitanNombre || 'Un jugador';
  const pacto = invitacionActual.pactoPartido;

  const handleAceptar = async () => {
    if (!sesion.user || !invitacionActual) return;
    setProcesandoId(invitacionActual.id);
    try {
      if (tipo === 'desafio_equipo') {
        await responderDesafioEquipo(invitacionActual.id, 'pactado');
        setToastExito(`¡Partido pactado contra ${invitacionActual.equipoNombre}! ⚽ Agendado en Mi Equipo`);
        setTimeout(() => setToastExito(null), 4000);
        navigate('/equipo');
      } else if (tipo === 'desafio_aviso_miembro') {
        await responderInvitacion(invitacionActual.id, 'aceptada').catch(() => {});
        navigate('/equipo');
      } else if (tipo === 'invitacion_equipo') {
        await unirseAEquipo(invitacionActual.equipoId, sesion.user.uid);
        await responderInvitacion(invitacionActual.id, 'aceptada');
        setToastExito(`¡Te uniste a ${invitacionActual.equipoNombre}! ⚽`);
        setTimeout(() => setToastExito(null), 4000);
        navigate('/equipo');
      } else if (tipo === 'desafio_aceptado') {
        if (invitacionActual.equipoId) {
          await incorporarRefuerzoAEquipo(invitacionActual.equipoId, {
            uid: invitacionActual.remitenteUid,
            nombre: nombreEmisor,
          }).catch((err) => console.warn('Error incorporando refuerzo al equipo:', err));
        }
        await responderInvitacion(invitacionActual.id, 'aceptada');
        setToastExito(`¡Sumaste a ${nombreEmisor} como refuerzo para el partido! ⚽`);
        setTimeout(() => setToastExito(null), 4000);
      } else if (tipo === 'postulacion_partido') {
        if (invitacionActual.alertaId) {
          await confirmarSuplente(invitacionActual.alertaId, invitacionActual.remitenteUid).catch((e) =>
            console.warn('Error confirmando suplente:', e)
          );
        }
        await responderInvitacion(invitacionActual.id, 'aceptada');
        setToastExito(`¡${nombreEmisor} sumado al partido con éxito! ⚽`);
        setTimeout(() => setToastExito(null), 4000);
      }
    } catch (err: any) {
      console.error('Error al responder alerta:', err);
      await responderInvitacion(invitacionActual.id, 'aceptada').catch(() => {});
      setToastExito(err?.message || 'Acción procesada');
      setTimeout(() => setToastExito(null), 3000);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleContraoferta = async () => {
    if (!sesion.user || !invitacionActual) return;
    setProcesandoId(invitacionActual.id);
    try {
      const nombreUsuario = sesion.usuario?.nombre || 'Capitán';
      await responderDesafioEquipo(invitacionActual.id, 'contraoferta', {
        emisorUid: sesion.user.uid,
        emisorNombre: nombreUsuario,
        equipoNombre: invitacionActual.destinatarioNombre || 'Equipo Rival',
        pingTexto: contraofertaSeleccionada,
      });
      setToastExito('Contraoferta enviada al rival 🔄');
      setTimeout(() => setToastExito(null), 3500);
      setModoContraoferta(false);
    } catch (err: any) {
      console.error('Error enviando contraoferta:', err);
      setToastExito(err?.message || 'Error al enviar contraoferta');
      setTimeout(() => setToastExito(null), 3000);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazar = async () => {
    if (!invitacionActual) return;
    setProcesandoId(invitacionActual.id);
    try {
      if (tipo === 'desafio_equipo') {
        await responderDesafioEquipo(invitacionActual.id, 'rechazado');
      } else if (tipo === 'postulacion_partido' && invitacionActual.alertaId) {
        await rechazarSuplente(invitacionActual.alertaId, invitacionActual.remitenteUid).catch(() => {});
        await responderInvitacion(invitacionActual.id, 'rechazada');
      } else {
        await responderInvitacion(invitacionActual.id, 'rechazada');
      }
    } catch (err) {
      console.error('Error al rechazar alerta:', err);
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <>
      <Toast mensaje={toastExito} />

      {/* Alerta Push Modal Interactivo */}
      <div
        className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleCerrar();
        }}
      >
        <div role="dialog" aria-modal="true" aria-label="Alerta de partido" className="relative w-full max-w-sm bg-zinc-900 border-2 border-amber-500/80 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-slide-up text-center">
          {/* Botón Cerrar (X) superior */}
          <button
            type="button"
            onClick={handleCerrar}
            aria-label="Cerrar alerta"
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>
          
          {/* Header Push Alert Badge */}
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 border border-amber-500/40 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-4 animate-pulse">
            <Bell className="w-3.5 h-3.5" />
            {tipo === 'desafio_equipo'
              ? 'Alerta Push • Desafío de Equipos'
              : tipo === 'desafio_aceptado'
              ? 'Alerta Push • Desafío Aceptado'
              : tipo === 'postulacion_partido'
              ? 'Alerta Push • Jugador Disponible'
              : 'Alerta Push • Nueva Invitación'}
          </div>

          {/* Icono / Escudo */}
          <div className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full bg-zinc-800 border-4 border-amber-500 flex items-center justify-center overflow-hidden mb-3 shadow-xl">
            {tipo === 'desafio_equipo' ? (
              <Swords className="w-9 h-9 sm:w-10 sm:h-10 text-amber-400" />
            ) : tipo === 'desafio_aceptado' ? (
              <Trophy className="w-10 h-10 text-amber-400" />
            ) : tipo === 'postulacion_partido' ? (
              <UserPlus className="w-10 h-10 text-amber-400" />
            ) : invitacionActual.equipoEscudoUrl ? (
              <img
                src={invitacionActual.equipoEscudoUrl}
                alt={invitacionActual.equipoNombre}
                className="w-full h-full object-cover"
              />
            ) : (
              <Shield className="w-10 h-10 text-amber-500" />
            )}
          </div>

          {/* Título y Mensaje */}
          <h3 className="text-lg sm:text-xl font-black text-white mb-1.5">
            {tipo === 'desafio_equipo'
              ? `¡Desafío de ${invitacionActual.equipoNombre}!`
              : tipo === 'desafio_aceptado'
              ? '¡Aceptaron tu desafío!'
              : tipo === 'postulacion_partido'
              ? '¡Quieren sumarse a tu partido!'
              : '¡Te invitaron a un equipo!'}
          </h3>

          {tipo === 'desafio_equipo' && pacto ? (
            <div className="mb-5 text-left bg-zinc-950/70 border border-zinc-800 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <span className="font-black text-amber-400">{pacto.modalidad}</span>
                {pacto.equipoDesafianteDivision && (
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                    {pacto.equipoDesafianteDivision}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-bold">{pacto.fechaTentativa}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {pacto.canchaOpcion === 'con_cancha'
                    ? `Cancha: ${pacto.predioNombre || 'Ya reservada'}`
                    : pacto.canchaOpcion === 'busca_cancha'
                    ? 'Buscamos cancha a medias'
                    : 'Proponen que elijan predio'}
                </span>
              </div>
              {pacto.pingsTacticos && pacto.pingsTacticos.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-start gap-1.5 text-zinc-400 italic">
                  <MessageSquareQuote className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">"{pacto.pingsTacticos[pacto.pingsTacticos.length - 1].texto}"</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
              {tipo === 'desafio_aceptado' ? (
                <>
                  <span className="font-bold text-amber-400">{nombreEmisor}</span> aceptó sumarse a jugar con{' '}
                  <span className="font-black text-white">{invitacionActual.equipoNombre}</span> ese día.
                </>
              ) : tipo === 'postulacion_partido' ? (
                <>
                  <span className="font-bold text-amber-400">{nombreEmisor}</span> se postuló para sumarse hoy al partido{' '}
                  {invitacionActual.posicion && (
                    <>
                      como <span className="font-bold text-white">{invitacionActual.posicion}</span>
                    </>
                  )}
                  .
                </>
              ) : (
                <>
                  <span className="font-bold text-amber-400">{nombreEmisor}</span> te invitó a unirte al plantel de{' '}
                  <span className="font-black text-white">{invitacionActual.equipoNombre}</span>.
                </>
              )}
            </p>
          )}

          {/* Subpanel de Contraoferta rápida */}
          {tipo === 'desafio_equipo' && modoContraoferta ? (
            <div className="mb-4 bg-zinc-950/80 border border-amber-500/40 rounded-2xl p-3 text-left animate-fade-in">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-2">
                Seleccioná una contraoferta rápida:
              </span>
              <div className="space-y-1.5 mb-3">
                {CHIPS_CONTRAOFERTA.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setContraofertaSeleccionada(chip)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                      contraofertaSeleccionada === chip
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModoContraoferta(false)}
                  className="w-1/3 py-2 bg-zinc-900 text-zinc-400 rounded-xl text-xs font-bold"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleContraoferta}
                  disabled={Boolean(procesandoId)}
                  className="w-2/3 py-2 bg-amber-500 text-zinc-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  {procesandoId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Contraoferta'}
                </button>
              </div>
            </div>
          ) : (
            /* Botones de acción estándar */
            <div className="space-y-2.5">
              <button
                onClick={handleAceptar}
                disabled={Boolean(procesandoId)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black py-3 sm:py-3.5 rounded-2xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 disabled:opacity-60 text-xs sm:text-sm uppercase tracking-wider cursor-pointer"
              >
                {procesandoId ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {tipo === 'desafio_equipo'
                      ? 'Aceptar Desafío (Cerrar Partido)'
                      : tipo === 'desafio_aviso_miembro'
                      ? 'Ver en Mi Equipo'
                      : tipo === 'invitacion_equipo'
                      ? 'Aceptar y Unirme'
                      : 'Confirmar Jugador'}
                  </>
                )}
              </button>

              {(tipo === 'desafio_equipo' || tipo === 'desafio_aviso_miembro') && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      abrirChatDesafio({ desafio: invitacionActual });
                    }}
                    className="w-full flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 rounded-xl border border-zinc-700 transition-all active:scale-95 text-xs cursor-pointer shadow-sm"
                  >
                    <MessageSquareQuote className="w-3.5 h-3.5 text-amber-400" />
                    Abrir Chat & Chips del Desafío
                  </button>

                  {tipo === 'desafio_equipo' && (
                    <button
                      type="button"
                      onClick={() => setModoContraoferta(true)}
                      disabled={Boolean(procesandoId)}
                      className="w-full flex items-center justify-center gap-1.5 bg-zinc-800/80 hover:bg-zinc-800 text-amber-400 font-bold py-2.5 rounded-xl border border-zinc-700/60 transition-all active:scale-95 text-xs cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Contraoferta Rápida
                    </button>
                  )}
                </>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCerrar}
                  className="flex-1 py-2 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleRechazar}
                  disabled={Boolean(procesandoId)}
                  className="flex-1 py-2 bg-transparent hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {tipo === 'desafio_equipo' ? 'Rechazar' : 'Descartar'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};
