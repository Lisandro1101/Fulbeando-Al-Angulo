import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Map as MapIcon, Shield, User } from 'lucide-react';

export const MenuNavegacion: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 w-full bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 px-6 py-3 flex justify-around items-center z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
      <button 
        onClick={() => navigate('/radar')}
        className={`flex flex-col items-center gap-1 transition ${location.pathname.includes('/radar') ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}
      >
        <MapIcon className="w-6 h-6" />
        <span className="text-[10px] font-bold">Radar</span>
      </button>
      <button 
        onClick={() => navigate('/my-team')}
        className={`flex flex-col items-center gap-1 transition ${location.pathname.includes('/my-team') ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}
      >
        <Shield className="w-6 h-6" />
        <span className="text-[10px] font-bold">Mi Equipo</span>
      </button>
      <button 
        onClick={() => navigate('/welcome')}
        className={`flex flex-col items-center gap-1 transition ${location.pathname.includes('/welcome') ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}
      >
        <User className="w-6 h-6" />
        <span className="text-[10px] font-bold">Perfil</span>
      </button>
    </div>
  );
};
