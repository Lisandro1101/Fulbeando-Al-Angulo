import React, { useState, useEffect, useMemo } from 'react';
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
import { BannersPersistentes } from '@/modules/ui/BannersPersistentes';

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
  const [chatRivalActivo, setChatRivalActivo] = useState<{
    equipoId: string;
    nombre: string;
    modalidad?: string;
    escudoUrl?: string | null;
    captainId?: string;
    divisionInfo?: { nombre: string; color: string; badge: string };
  } | null>(null);

  useEffect(() => {
    const handleAbrirBandeja = () => {
      setMostrarBandejaChats(true);
    };

    const handleAbrirChat = (e: Event) => {
      const customEvent = e as CustomEvent<{
        desafio?: InvitacionEquipo | null;
        rival?: {
          equipoId: string;
          nombre: string;
          modalidad?: string;
          escudoUrl?: string | null;
          captainId?: string;
          divisionInfo?: { nombre: string; color: string; badge: string };
        };
      }>;
      if (customEvent.detail?.desafio) {
        setDesafioChatActivo(customEvent.detail.desafio);
        setChatRivalActivo(null);
      } else if (customEvent.detail?.rival) {
        setChatRivalActivo(customEvent.detail.rival);
        setDesafioChatActivo(null);
      }
      setMostrarBandejaChats(false);
    };

    window.addEventListener('abrir-bandeja-chats', handleAbrirBandeja);
    window.addEventListener('abrir-chat-desafio', handleAbrirChat);

    return () => {
      window.removeEventListener('abrir-bandeja-chats', handleAbrirBandeja);
      window.removeEventListener('abrir-chat-desafio', handleAbrirChat);
    };
  }, []);

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

  // Cantidad de desafíos pendientes o no leídos dirigidos al usuario (deduplicados y omitiendo los enviados por uno mismo)
  const noLeidosCount = useMemo(() => {
    const vistos = new Set<string>();
    return desafios.filter((d) => {
      const clave = d.desafioId || d.pactoPartido?.id || d.id;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      if (d.pactoPartido?.estado === 'pactado' || d.pactoPartido?.estado === 'rechazado') return false;
      const ultimoPing = d.pactoPartido?.pingsTacticos?.slice(-1)[0];
      const ultimoEmisor = ultimoPing?.emisorUid || d.ultimoEmisorUid || d.remitenteUid;
      if (ultimoEmisor === sesion.user?.uid) return false;
      return !d.leida;
    }).length;
  }, [desafios, sesion.user?.uid]);

  // Cantidad de notificaciones generales no leídas (deduplicadas)
  const notificacionesNoLeidasCount = useMemo(() => {
    const vistos = new Set<string>();
    return notificaciones.filter((n) => {
      const clave = n.desafioId || n.pactoPartido?.id || n.id;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return !n.leida;
    }).length;
  }, [notificaciones]);

  // Decide if we should render background + modal
  // We only do this if we actually match one of the floating routes and have a backgroundLocation
  const esModal = Boolean(state?.backgroundLocation);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#1E0D4A] font-sans">
      {/* Alerta Push de Invitaciones en tiempo real para el jugador */}
      <AlertaInvitacionPush />

      {/* Carteles Flotantes Permanentes: Instalar App & Permiso Notificaciones */}
      <BannersPersistentes />

      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <MenuNavegacion 
        onAbrirNotificaciones={() => setMostrarPanelNotificaciones(true)}
        onAbrirChats={() => setMostrarBandejaChats(true)}
        notificacionesNoLeidas={notificacionesNoLeidasCount}
        chatsNoLeidos={noLeidosCount}
      />

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

      {/* Botones de Notificaciones y Mensajes en Desktop (PC - esquina superior derecha) */}
      {sesion.user && (
        <div className="hidden md:flex fixed top-4 right-6 z-[110] items-center gap-3 bg-[#281165]/85 hover:bg-[#281165] backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#4c24b2]/50 shadow-xl shadow-black/30 transition-all">
          {/* Botón Campanita de Notificaciones */}
          <button
            onClick={() => setMostrarPanelNotificaciones(true)}
            aria-label="Abrir panel de notificaciones"
            title="Notificaciones"
            className="relative p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition text-white border border-white/15 cursor-pointer shadow-md group"
          >
            <Bell className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            {notificacionesNoLeidasCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-amber-500 text-zinc-950 text-[11px] font-black rounded-full flex items-center justify-center shadow-lg border border-[#361982] animate-bounce">
                {notificacionesNoLeidasCount > 9 ? '9+' : notificacionesNoLeidasCount}
              </span>
            )}
          </button>

          {/* Botón de Mensajes / Notificaciones de Desafíos */}
          <button
            onClick={() => setMostrarBandejaChats(true)}
            aria-label="Abrir chats de desafíos"
            title="Mensajes y Desafíos"
            className="relative p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition text-white border border-white/15 cursor-pointer shadow-md group"
          >
            <MessageSquare className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            {noLeidosCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-emerald-500 text-zinc-950 text-[11px] font-black rounded-full flex items-center justify-center shadow-lg border border-[#361982] animate-bounce">
                {noLeidosCount > 9 ? '9+' : noLeidosCount}
              </span>
            )}
          </button>
        </div>
      )}

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

      {/* Modal de Chat de Desafío Seleccionado o Nuevo Desafío (Módulo de Chats) */}
      {(desafioChatActivo || chatRivalActivo) && sesion.user && (
        <ModalProponerDesafio
          abierto={Boolean(desafioChatActivo || chatRivalActivo)}
          onCerrar={() => {
            setDesafioChatActivo(null);
            setChatRivalActivo(null);
          }}
          desafioInicial={desafioChatActivo}
          rival={
            chatRivalActivo || {
              equipoId:
                desafioChatActivo!.remitenteUid === sesion.user.uid
                  ? desafioChatActivo!.pactoPartido?.equipoRivalId || ''
                  : desafioChatActivo!.equipoId,
              nombre:
                desafioChatActivo!.remitenteUid === sesion.user.uid
                  ? desafioChatActivo!.pactoPartido?.equipoRivalNombre || desafioChatActivo!.destinatarioNombre || 'Equipo Rival'
                  : desafioChatActivo!.equipoNombre,
              escudoUrl:
                desafioChatActivo!.remitenteUid === sesion.user.uid
                  ? desafioChatActivo!.pactoPartido?.equipoRivalEscudoUrl || null
                  : desafioChatActivo!.equipoEscudoUrl || null,
              captainId:
                desafioChatActivo!.remitenteUid === sesion.user.uid
                  ? desafioChatActivo!.destinatarioUid
                  : desafioChatActivo!.remitenteUid,
            }
          }
          usuarioActual={{
            uid: sesion.user.uid,
            nombre: sesion.usuario?.nombre || sesion.user.displayName || 'Capitán',
            apellido: sesion.usuario?.apellido || '',
          }}
        />
      )}

      {/* Main Content Area con degradé claro deportivo para contraste óptimo */}
      <main className="flex-1 h-full relative overflow-hidden pt-16 md:pt-0 md:pl-64 bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0]/70 text-slate-800">
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
