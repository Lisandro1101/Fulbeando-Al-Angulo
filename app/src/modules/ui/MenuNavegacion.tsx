import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Map as MapIcon, Home, Calendar, User, Building, Shield, Settings, Bell, MessageSquare } from 'lucide-react';
import { useSesion } from '@/modules/auth/useSesion';

export interface MenuNavegacionProps {
  onAbrirNotificaciones?: () => void;
  onAbrirChats?: () => void;
  notificacionesNoLeidas?: number;
  chatsNoLeidos?: number;
}

export const MenuNavegacion: React.FC<MenuNavegacionProps> = ({
  onAbrirNotificaciones,
  onAbrirChats,
  notificacionesNoLeidas = 0,
  chatsNoLeidos = 0,
}) => {
  const location = useLocation();
  const { usuario } = useSesion();

  // Solo `dueno_predio`: el rol 'dueno' del modelo legacy ya no existe en `Rol`.
  const esDueno = usuario?.rol === 'dueno_predio';

  /**
   * El dueno no tiene ficha de jugador, asi que tampoco tiene Radar, Equipo ni
   * Reservas: esas pantallas estan ademas vedadas por el guard de la ruta.
   * Su unica salida es su panel.
   */
  const item = (activo: boolean) =>
    `flex md:flex-row flex-col items-center md:items-center gap-1 md:gap-3 transition-all w-full md:px-4 md:py-3 md:rounded-2xl cursor-pointer ${
      activo
        ? 'text-emerald-300 font-black md:bg-gradient-to-r md:from-emerald-400/20 md:via-emerald-400/10 md:to-transparent md:border-l-4 md:border-emerald-400 shadow-sm shadow-emerald-400/20'
        : 'text-indigo-200/80 hover:text-white md:hover:bg-white/10 font-medium'
    }`;

  return (
    <div className="fixed bottom-0 left-0 w-full z-[100] md:w-64 md:h-screen md:bottom-auto md:top-0 md:border-r md:border-[#4c24b2]/40 md:bg-gradient-to-b md:from-[#361982] md:via-[#281165] md:to-[#1c0a48] flex flex-col justify-end md:justify-start pointer-events-none md:pointer-events-auto">
      {/* Barra de Navegación */}
      <nav className="pointer-events-auto bg-gradient-to-r from-[#361982]/95 via-[#281165]/95 to-[#1c0a48]/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-t md:border-t-0 border-[#4c24b2]/40 px-2 sm:px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pt-2 md:pb-6 flex justify-around md:flex-col md:justify-start md:items-start md:gap-1.5 md:h-full items-center shadow-2xl md:shadow-none">
        {/* LOGO EN DESKTOP */}
        <div className="hidden md:flex items-center justify-center mb-1 w-full px-3 text-center">
          <img src="/logo-anterior.svg" alt="Al Ángulo" className="w-full h-auto max-h-24 object-contain object-center drop-shadow-xl" />
        </div>

        <NavLink 
          to="/"
          className={({ isActive }) => item(isActive && location.pathname === '/')}
        >
          <Home className="w-6 h-6 md:w-5 md:h-5 shrink-0" />
          <span className="text-[11px] md:text-sm font-bold">Comunidad</span>
        </NavLink>

        {esDueno ? (
          <>
            <NavLink to="/venue-dashboard" className={({ isActive }) => item(isActive)}>
              <Building className="w-6 h-6 md:w-5 md:h-5 shrink-0" />
              <span className="text-[11px] md:text-sm font-bold">Mi Predio</span>
            </NavLink>

            <NavLink to="/ajustes" className={({ isActive }) => item(isActive)}>
              <Settings className="w-6 h-6 md:w-5 md:h-5 shrink-0" />
              <span className="text-[11px] md:text-sm font-bold">Ajustes</span>
            </NavLink>
          </>
        ) : (
          <>
            <NavLink 
              to="/radar"
              className={({ isActive }) => item(isActive)}
            >
              <MapIcon className="w-6 h-6 md:w-5 md:h-5 shrink-0" />
              <span className="text-[11px] md:text-sm font-bold">Radar</span>
            </NavLink>

            <NavLink 
              to="/equipo"
              className={({ isActive }) => item(isActive)}
            >
              <Shield className="w-6 h-6 md:w-5 md:h-5 shrink-0" />
              <span className="text-[11px] md:text-sm font-bold">Equipo</span>
            </NavLink>

            <NavLink 
              to="/turnos"
              className={({ isActive }) => item(isActive)}
            >
              <Calendar className="w-6 h-6 md:w-5 md:h-5 shrink-0" />
              <span className="text-[11px] md:text-sm font-bold">Reservas</span>
            </NavLink>

            <NavLink 
              to="/perfil"
              className={({ isActive }) => item(isActive)}
            >
              <User className="w-6 h-6 md:w-5 md:h-5 shrink-0" />
              <span className="text-[11px] md:text-sm font-bold">Perfil</span>
            </NavLink>
          </>
        )}

        {/* Accesos a Notificaciones y Mensajes en Desktop (PC) */}
        {(onAbrirNotificaciones || onAbrirChats) && (
          <div className="hidden md:flex flex-col w-full gap-1 pt-3 mt-2 border-t border-[#4c24b2]/40">
            {onAbrirNotificaciones && (
              <button
                type="button"
                onClick={onAbrirNotificaciones}
                className="flex items-center gap-3 transition-all w-full px-4 py-2.5 rounded-2xl cursor-pointer text-indigo-200/80 hover:text-white hover:bg-white/10 font-medium text-left group"
              >
                <div className="relative">
                  <Bell className="w-5 h-5 shrink-0 text-amber-400 group-hover:scale-110 transition-transform" />
                  {notificacionesNoLeidas > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-4 px-1 bg-amber-500 text-zinc-950 text-[10px] font-black rounded-full flex items-center justify-center shadow">
                      {notificacionesNoLeidas > 9 ? '9+' : notificacionesNoLeidas}
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold flex-1">Notificaciones</span>
                {notificacionesNoLeidas > 0 && (
                  <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] px-2 py-0.5 rounded-full font-bold">
                    {notificacionesNoLeidas}
                  </span>
                )}
              </button>
            )}

            {onAbrirChats && (
              <button
                type="button"
                onClick={onAbrirChats}
                className="flex items-center gap-3 transition-all w-full px-4 py-2.5 rounded-2xl cursor-pointer text-indigo-200/80 hover:text-white hover:bg-white/10 font-medium text-left group"
              >
                <div className="relative">
                  <MessageSquare className="w-5 h-5 shrink-0 text-emerald-400 group-hover:scale-110 transition-transform" />
                  {chatsNoLeidos > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-4 px-1 bg-emerald-500 text-zinc-950 text-[10px] font-black rounded-full flex items-center justify-center shadow">
                      {chatsNoLeidos > 9 ? '9+' : chatsNoLeidos}
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold flex-1">Mensajes</span>
                {chatsNoLeidos > 0 && (
                  <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 text-[11px] px-2 py-0.5 rounded-full font-bold">
                    {chatsNoLeidos}
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </nav>
    </div>
  );
};
