import React from 'react';
import { UserPlus, MessageCircle, X } from 'lucide-react';
import type { Usuario } from '@/domain';

interface RadarFloatingCardProps {
  user: Usuario;
  onClose: () => void;
  onInviteToMatch: (uid: string) => void;
  onRecruit: (uid: string) => void;
}

/**
 * Componente UI: Tarjeta inferior que se despliega al tocar un pin de Jugador Libre en el mapa.
 */
export const RadarFloatingCard: React.FC<RadarFloatingCardProps> = ({ user, onClose, onInviteToMatch, onRecruit }) => {
  const stats = user.stats || { partidosJugados: 0, goles: 0, fairPlayScore: 5.0 };
  const posicion = user.perfilDeportivo?.posicion || 'MED';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-full duration-300">
      <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* HEADER MINI-CARTA */}
        <div className="relative bg-gradient-to-r from-blue-600 to-cyan-500 p-4 flex items-center gap-4">
          <button onClick={onClose} className="absolute top-2 right-2 p-1 text-white/70 hover:text-white bg-black/20 rounded-full">
            <X className="w-4 h-4" />
          </button>
          
          <div className="relative">
            {user.fotoUrl ? (
              <img src={user.fotoUrl} alt={user.displayName} className="w-16 h-16 rounded-full border-2 border-white object-cover shadow-sm" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-white flex items-center justify-center shadow-sm">
                <span className="text-xl">⚽</span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white shadow-sm"></div>
          </div>

          <div className="text-white flex-1">
            <h3 className="text-lg font-black leading-tight">{user.displayName}</h3>
            <div className="flex gap-2 text-xs font-semibold mt-1">
              <span className="bg-black/20 px-2 py-0.5 rounded-md uppercase">{posicion}</span>
              <span className="bg-amber-400 text-amber-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                ⭐ {stats.fairPlayScore.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* ACCIONES */}
        <div className="p-4 grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900">
          <button 
            onClick={() => onInviteToMatch(user.uid!)}
            className="flex flex-col items-center justify-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl shadow-sm hover:border-blue-500 hover:text-blue-500 transition text-slate-700 dark:text-slate-300 font-semibold text-sm"
          >
            <MessageCircle className="w-5 h-5 text-blue-500" />
            Invitar a Hoy
          </button>
          
          <button 
            onClick={() => onRecruit(user.uid!)}
            className="flex flex-col items-center justify-center gap-1 bg-amber-400 dark:bg-amber-500 text-amber-950 py-3 rounded-xl shadow-sm hover:opacity-90 transition font-black text-sm"
          >
            <UserPlus className="w-5 h-5" />
            Fichar a Equipo
          </button>
        </div>

      </div>
    </div>
  );
};
