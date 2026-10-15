import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Shield, Check, X, Loader2, Trophy, UserPlus } from 'lucide-react';
import { useSesion } from '@/modules/auth/useSesion';
import {
  escucharInvitacionesPendientes,
  responderInvitacion,
  unirseAEquipo,
  incorporarRefuerzoAEquipo,
  type InvitacionEquipo,
} from '@/modules/teams/teamService';
import { confirmarSuplente, rechazarSuplente } from '@/modules/alertas/repositorio';
import { dispararNotificacionPushLocal } from '@/modules/notifications/pushService';
import { Toast } from '@/modules/ui/overlays';

export const AlertaInvitacionPush: React.FC = () => {
  const sesion = useSesion();
  const navigate = useNavigate();
  const [invitaciones, setInvitaciones] = useState<InvitacionEquipo[]>([]);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [toastExito, setToastExito] = useState<string | null>(null);

  useEffect(() => {
    if (!sesion.user) {
      setInvitaciones([]);
      return;
    }

    const unsub = escucharInvitacionesPendientes(sesion.user.uid, (lista) => {
      const masReciente = lista[0];
      if (masReciente) {
        const nombreEmisor = masReciente.remitenteNombre || masReciente.capitanNombre || 'Un jugador';
        let tituloNotif = '¡Alerta de Partido en Fulbeando!';
        let cuerpoNotif = `${nombreEmisor} te envió una notificación.`;

        if (masReciente.tipo === 'desafio_aceptado') {
          tituloNotif = '¡Aceptaron tu desafío de partido! ⚽';
          cuerpoNotif = masReciente.mensaje || `${nombreEmisor} aceptó el desafío para jugar con ${masReciente.equipoNombre}.`;
        } else if (masReciente.tipo === 'postulacion_partido') {
          tituloNotif = '¡Nuevo jugador para tu partido! 🏃';
          cuerpoNotif = masReciente.mensaje || `${nombreEmisor} quiere sumarse como suplente ese día.`;
        } else {
          tituloNotif = '¡Te invitaron a un equipo en Fulbeando!';
          cuerpoNotif = `${nombreEmisor} te invitó a unirte a ${masReciente.equipoNombre}. ¡Entrá a responder!`;
        }

        dispararNotificacionPushLocal(tituloNotif, {
          body: cuerpoNotif,
          icon: masReciente.equipoEscudoUrl || '/pwa-192x192.png',
        });
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.([120, 80, 120]);
        }
      }
      setInvitaciones(lista);
    });

    return () => unsub();
  }, [sesion.user]);

  const invitacionActual = invitaciones[0];

  if (!sesion.user || !invitacionActual) {
    return <Toast mensaje={toastExito} />;
  }

  const tipo = invitacionActual.tipo || 'invitacion_equipo';
  const nombreEmisor = invitacionActual.remitenteNombre || invitacionActual.capitanNombre || 'Un jugador';

  const handleAceptar = async () => {
    if (!sesion.user || !invitacionActual) return;
    setProcesandoId(invitacionActual.id);
    try {
      if (tipo === 'invitacion_equipo') {
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

  const handleRechazar = async () => {
    if (!invitacionActual) return;
    setProcesandoId(invitacionActual.id);
    try {
      if (tipo === 'postulacion_partido' && invitacionActual.alertaId) {
        await rechazarSuplente(invitacionActual.alertaId, invitacionActual.remitenteUid).catch(() => {});
      }
      await responderInvitacion(invitacionActual.id, 'rechazada');
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
      <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
        <div role="dialog" aria-modal="true" aria-label="Invitación a equipo" className="relative w-full max-w-sm bg-zinc-900 border-2 border-amber-500/80 rounded-3xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-slide-up text-center">
          
          {/* Header Push Alert Badge */}
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 border border-amber-500/40 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-5 animate-pulse">
            <Bell className="w-3.5 h-3.5" />
            {tipo === 'desafio_aceptado'
              ? 'Alerta Push • Desafío Aceptado'
              : tipo === 'postulacion_partido'
              ? 'Alerta Push • Jugador Disponible'
              : 'Alerta Push • Nueva Invitación'}
          </div>

          {/* Icono / Escudo */}
          <div className="w-20 h-20 mx-auto rounded-full bg-zinc-800 border-4 border-amber-500 flex items-center justify-center overflow-hidden mb-4 shadow-xl">
            {tipo === 'desafio_aceptado' ? (
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
          <h3 className="text-xl font-black text-white mb-2">
            {tipo === 'desafio_aceptado'
              ? '¡Aceptaron tu desafío!'
              : tipo === 'postulacion_partido'
              ? '¡Quieren sumarse a tu partido!'
              : '¡Te invitaron a un equipo!'}
          </h3>

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

          {/* Botones de acción */}
          <div className="space-y-3">
            <button
              onClick={handleAceptar}
              disabled={Boolean(procesandoId)}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 disabled:opacity-60"
            >
              {procesandoId ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  {tipo === 'invitacion_equipo' ? 'Aceptar y Unirme' : 'Confirmar Jugador'}
                </>
              )}
            </button>

            <button
              onClick={handleRechazar}
              disabled={Boolean(procesandoId)}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold py-3 rounded-xl transition-all active:scale-95 text-xs disabled:opacity-60"
            >
              <X className="w-4 h-4" />
              Descartar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
