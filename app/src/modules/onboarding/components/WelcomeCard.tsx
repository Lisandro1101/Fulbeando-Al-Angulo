import React from 'react';
import { Share2, ShieldPlus, MapPinned } from 'lucide-react';
import { nombreCompleto, type Usuario } from '@/domain';

interface WelcomeCardProps {
  user: Usuario;
  onShare: () => void;
  onCreateTeam: () => void;
  onExploreRadar: () => void;
}

/**
 * Componente UI: Carta de Jugador (Estilo FUT) + Onboarding Actions
 * Mobile-First y Cero fricciÃ³n al entrar.
 */
export const WelcomeCard: React.FC<WelcomeCardProps> = ({ user, onShare, onCreateTeam, onExploreRadar }) => {
  // Stats base en cero si no existen
  const stats = user.perfilDeportivo?.stats
    ?? { goals: 0, matchesPlayed: 0, mvpCount: 0, fairPlayIndex: 5.0 };
  const position = user.perfilDeportivo?.posicion || 'DEL';

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto p-4 space-y-6">
      
      {/* HEADER BBIENVENIDA */}
      <div className="text-center">
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Â¡Bienvenido a la cancha!</h1>
        <p className="text-slate-500 text-sm mt-1">Tu perfil de jugador ya estÃ¡ listo.</p>
      </div>

      {/* CARTA ESTILO FUT */}
      <div className="relative w-64 h-96 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-3xl p-1 shadow-2xl overflow-hidden transform transition hover:scale-105">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative h-full w-full bg-slate-900 rounded-[22px] flex flex-col items-center p-6 text-white border-4 border-amber-400/50">
          
          <div className="absolute top-4 left-4 text-3xl font-black text-amber-400 drop-shadow-md">
            {stats.fairPlayIndex.toFixed(1)}
          </div>
          <div className="absolute top-12 left-4 text-sm font-bold text-slate-300">
            {position}
          </div>

          <div className="mt-8 mb-4">
            {user.fotoUrl ? (
              <img src={user.fotoUrl} alt="Avatar" className="w-32 h-32 rounded-full object-cover border-4 border-amber-400 shadow-lg" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center border-4 border-amber-400 shadow-lg">
                <span className="text-4xl">âš½</span>
              </div>
            )}
          </div>

          <h2 className="text-2xl font-black tracking-tight mb-4 uppercase">{nombreCompleto(user)}</h2>
          
          <div className="w-full border-t border-slate-700 pt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-black text-amber-400">{stats.matchesPlayed}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">Partidos</div>
            </div>
            <div>
              <div className="text-2xl font-black text-amber-400">{stats.goals}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">Goles</div>
            </div>
          </div>
        </div>
      </div>

      {/* ACCIONES (Cero FricciÃ³n) */}
      <div className="w-full space-y-3">
        <button onClick={onCreateTeam} className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 font-bold py-4 rounded-xl shadow-lg hover:opacity-90 transition">
          <ShieldPlus className="w-5 h-5" />
          Crear mi Equipo
        </button>

        <button onClick={onExploreRadar} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:opacity-90 transition">
          <MapPinned className="w-5 h-5" />
          Explorar Radar de la Zona
        </button>
        
        <button onClick={onShare} className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold py-3 rounded-xl hover:bg-slate-200 transition">
          <Share2 className="w-4 h-4" />
          Compartir mi Ficha
        </button>
      </div>

    </div>
  );
};
