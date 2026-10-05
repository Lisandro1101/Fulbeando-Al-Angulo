import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Map as MapIcon, Home, Calendar, User, Building, Shield } from 'lucide-react';
import { useSesion } from '@/modules/auth/useSesion';

export const MenuNavegacion: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario } = useSesion();

  const esDueno = usuario?.rol === 'dueno_predio' || usuario?.rol === 'dueno';
  const esAdmin = usuario?.rol === 'superadmin';

  return (
    <div className="fixed bottom-0 left-0 w-full z-[100]">
      {/* Botón destacado Modo Administrador en el Perfil */}
      {(esDueno || esAdmin) && location.pathname.startsWith('/perfil') && (
        <div className="px-4 pb-4 animate-fade-in-up">
          <button 
            onClick={() => navigate(esAdmin ? '/superadmin' : '/venue-dashboard')} 
            className="w-full bg-amber-500 text-zinc-950 font-black py-3 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            {esAdmin ? <Shield className="w-5 h-5" /> : <Building className="w-5 h-5" />}
            {esAdmin ? 'MODO SUPERADMIN' : 'MODO ADMINISTRADOR DE PREDIO'}
          </button>
        </div>
      )}

      {/* Barra de Navegación */}
      <nav className="bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-around items-center shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
        <NavLink 
          to="/"
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive && location.pathname === '/' ? 'text-amber-500 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-bold">Comunidad</span>
        </NavLink>

        <NavLink 
          to="/radar"
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-amber-500 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <MapIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold">Radar</span>
        </NavLink>

        <NavLink 
          to="/turnos"
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-amber-500 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-[10px] font-bold">Reservas</span>
        </NavLink>

        <NavLink 
          to="/perfil"
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-amber-500 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-bold">Perfil</span>
        </NavLink>
      </nav>
    </div>
  );
};
