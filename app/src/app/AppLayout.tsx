import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { MenuNavegacion } from '@/modules/ui/MenuNavegacion';
import { X, MessageSquare, Bell } from 'lucide-react';
import { useSesion } from '@/modules/auth/useSesion';
import {
  escucharDesafiosUsuario,
  escucharNotificacionesUsuario,
  type InvitacionEquipo,
} from '@/modules/teams/teamService';
import { BandejaChatsDesafio } from '@/modules/teams/components/BandejaChatsDesafio';
import { PanelNotificaciones } from '@/modules/teams/components/PanelNotificaciones';
import { ModalProponerDesafio } from '@/modules/radar/componentes/ModalProponerDesafio';

// Modales que queremos que floten en desktop
import CargaDeSena from '@/modules/turnos/pantallas/CargaDeSena';
import { Screen6LaunchChallenge, Screen7MyTeam, Screen8VenueRegistration } from '@/modules/ui/Screens';

const FlotanteModal = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8 animate-fade-in">
      <div role="dialog" aria-modal="true" aria-label="Ventana modal" className="relative w-full max-w-xl h-full md:h-auto md:max-h-[85vh] overflow-hidden rounded-3xl shadow-2xl bg-[#0B0F19] border border-zinc-800 animate-slide-up flex flex-col">
        <button 
          onClick={() => navigate(-1)}
          aria-label="Cerrar modal"
          className="absolute top-4 right-4 z-[300] bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/60 p-2 rounded-full text-zinc-400 hover:text-white transition-all cursor-pointer shadow-md active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {children}
        </div>
      </div>
    </div>
  );
};

import { AlertaInvitacionPush } from '@/modules/teams/components/AlertaInvitacionPush';

export const AppLayout = () => {
  const location = useLocation();
  const sesion = useSesion();
  const state = location.state as { backgroundLocation?: Location };

  // Bandeja de chats y notificaciones
  const [desafios, setDesafios] = useState<InvitacionEquipo[]>([]);
  const [notificaciones, setNotificaciones] = useState<InvitacionEquipo[]>([]);
  const [mostrarBandejaChats, setMostrarBandejaChats] = useState(false);
  const [mostrarPanelNotificaciones, setMostrarPanelNotificaciones] = useState(false);
  const [desafioChatActivo, setDesafioChatActivo] = useState<InvitacionEquipo | null>(null);

  useEffect(() => {
    if (!sesion.user?.uid) {
      setDesafios([]);
      setNotificaciones([]);
      return;
    }
    const unsubDesafios = escucharDesafiosUsuario(sesion.user.uid, setDesafios);
    const unsubNotificaciones = escucharNotificacionesUsuario(sesion.user.uid, setNotificaciones);
    return () => {
      unsubDesafios();
      unsubNotificaciones();
    };
  }, [sesion.user?.uid]);

  // Cantidad de desafíos pendientes o no leídos dirigidos al usuario
  const noLeidosCount = desafios.filter(
    (d) => !d.leida && d.destinatarioUid === sesion.user?.uid
  ).length;

  // Cantidad de notificaciones generales no leídas
  const notificacionesNoLeidasCount = notificaciones.filter(
    (n) => !n.leida
  ).length;

  // Decide if we should render background + modal
  // We only do this if we actually match one of the floating routes and have a backgroundLocation
  const esModal = Boolean(state?.backgroundLocation);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#0B0F19] text-white font-sans">
      {/* Alerta Push de Invitaciones en tiempo real para el jugador */}
      <AlertaInvitacionPush />

      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <MenuNavegacion />

      {/* Cabecera mobile: logo a la izquierda e iconos de Notificaciones y Mensajes con badge a la derecha */}
      <header className="md:hidden fixed inset-x-0 top-0 z-[90] border-b border-[#4c24b2]/40 bg-gradient-to-r from-[#361982] via-[#281165] to-[#361982] backdrop-blur-md shadow-md">
        <div className="flex h-16 items-center justify-between px-4">
          <img 
            src="/logo-anterior.svg" 
            alt="Al Ángulo" 
            className="h-12 w-auto max-w-[190px] object-contain object-left drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]" 
          />

          {/* Botones de Notificaciones y Mensajes */}
          {sesion.user && (
            <div className="flex items-center gap-2">
              {/* Botón Campanita de Notificaciones */}
              <button
                onClick={() => setMostrarPanelNotificaciones(true)}
                aria-label="Abrir panel de notificaciones"
                className="relative p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition text-white border border-white/15 cursor-pointer shadow-md"
              >
                <Bell className="w-5 h-5 text-amber-400" />
                {notificacionesNoLeidasCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-amber-500 text-zinc-950 text-[11px] font-black rounded-full flex items-center justify-center shadow-lg border border-[#361982] animate-bounce">
                    {notificacionesNoLeidasCount > 9 ? '9+' : notificacionesNoLeidasCount}
                  </span>
                )}
              </button>

              {/* Botón de Mensajes / Notificaciones de Desafíos */}
              <button
                onClick={() => setMostrarBandejaChats(true)}
                aria-label="Abrir chats de desafíos"
                className="relative p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition text-white border border-white/15 cursor-pointer shadow-md"
              >
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                {noLeidosCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-emerald-500 text-zinc-950 text-[11px] font-black rounded-full flex items-center justify-center shadow-lg border border-[#361982] animate-bounce">
                    {noLeidosCount > 9 ? '9+' : noLeidosCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Panel Flotante de Notificaciones Generales */}
      {mostrarPanelNotificaciones && sesion.user && (
        <PanelNotificaciones
          abierto={mostrarPanelNotificaciones}
          onCerrar={() => setMostrarPanelNotificaciones(false)}
          usuarioUid={sesion.user.uid}
          notificaciones={notificaciones}
          onAbrirChatDesafio={(desafio) => {
            setMostrarPanelNotificaciones(false);
            setDesafioChatActivo(desafio);
          }}
        />
      )}

      {/* Bandeja Flotante de Chats de Desafíos */}
      {mostrarBandejaChats && sesion.user && (
        <BandejaChatsDesafio
          abierto={mostrarBandejaChats}
          onCerrar={() => setMostrarBandejaChats(false)}
          usuarioUid={sesion.user.uid}
          desafios={desafios}
          onAbrirChat={(desafio) => {
            setDesafioChatActivo(desafio);
            setMostrarBandejaChats(false);
          }}
        />
      )}

      {/* Modal de Chat de Desafío Seleccionado */}
      {desafioChatActivo && sesion.user && (
        <ModalProponerDesafio
          abierto={Boolean(desafioChatActivo)}
          onCerrar={() => setDesafioChatActivo(null)}
          desafioInicial={desafioChatActivo}
          rival={{
            equipoId:
              desafioChatActivo.remitenteUid === sesion.user.uid
                ? desafioChatActivo.pactoPartido?.equipoRivalId || ''
                : desafioChatActivo.equipoId,
            nombre:
              desafioChatActivo.remitenteUid === sesion.user.uid
                ? desafioChatActivo.pactoPartido?.equipoRivalNombre || desafioChatActivo.destinatarioNombre || 'Equipo Rival'
                : desafioChatActivo.equipoNombre,
            escudoUrl:
              desafioChatActivo.remitenteUid === sesion.user.uid
                ? desafioChatActivo.pactoPartido?.equipoRivalEscudoUrl || null
                : desafioChatActivo.equipoEscudoUrl || null,
            captainId:
              desafioChatActivo.remitenteUid === sesion.user.uid
                ? desafioChatActivo.destinatarioUid
                : desafioChatActivo.remitenteUid,
          }}
          usuarioActual={{
            uid: sesion.user.uid,
            nombre: sesion.usuario?.nombre || sesion.user.displayName || 'Capitán',
            apellido: sesion.usuario?.apellido || '',
          }}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 h-full relative overflow-hidden pt-16 md:pt-0 md:pl-64">
        {/* We use React Router's trick to render the background if state.backgroundLocation exists */}
        {esModal ? (
          <Routes location={state.backgroundLocation}>
             <Route path="*" element={<Outlet />} />
          </Routes>
        ) : (
          <Outlet />
        )}
      </main>

      {/* Modales Flotantes en Desktop/Mobile */}
      {esModal && (
        <Routes>
          <Route path="/reservar/:predioId" element={<FlotanteModal><CargaDeSena /></FlotanteModal>} />
          <Route path="/partidos" element={<FlotanteModal><Screen6LaunchChallenge /></FlotanteModal>} />
          <Route path="/equipo" element={<FlotanteModal><Screen7MyTeam /></FlotanteModal>} />
          <Route path="/venue-registration" element={<FlotanteModal><Screen8VenueRegistration /></FlotanteModal>} />
        </Routes>
      )}
    </div>
  );
};
