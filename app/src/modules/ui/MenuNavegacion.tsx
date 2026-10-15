import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Map as MapIcon, Home, Calendar, User, Building, Shield, Settings } from 'lucide-react';
import { useSesion } from '@/modules/auth/useSesion';

export const MenuNavegacion: React.FC = () => {
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
        ? 'text-amber-500 scale-105 md:scale-100 font-black md:bg-amber-500/10'
        : 'text-zinc-500 hover:text-zinc-300 md:hover:bg-zinc-900 font-medium'
    }`;

  return (
    <div className="fixed bottom-0 left-0 w-full z-[100] md:w-64 md:h-screen md:bottom-auto md:top-0 md:border-r md:border-zinc-800 md:bg-canvas/90 md:backdrop-blur-md flex flex-col justify-end md:justify-start pointer-events-none md:pointer-events-auto">
      {/* Barra de Navegación */}
      <nav className="pointer-events-auto bg-canvas/95 md:bg-transparent backdrop-blur-lg md:backdrop-blur-none border-t md:border-t-0 border-zinc-800/80 px-2 sm:px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:py-8 flex justify-around md:flex-col md:justify-start md:items-start md:gap-3 md:h-full items-center shadow-[0_-10px_25px_rgba(0,0,0,0.6)] md:shadow-none">
        {/* LOGO EN DESKTOP */}
        <div className="hidden md:block mb-6 w-full">
          <img src="/logo.svg" alt="Al Ángulo" className="w-full h-24 object-cover object-center" />
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
      </nav>
    </div>
  );
};
