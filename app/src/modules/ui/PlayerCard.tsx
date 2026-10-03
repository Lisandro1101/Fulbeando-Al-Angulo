import React from 'react';

/**
 * CARTA DE JUGADOR (FUT Style)
 * Cero librerías pesadas, 100% puro CSS/Tailwind.
 */
export const PlayerCard = () => {
  return (
    <div className="relative w-64 h-[340px] rounded-2xl overflow-hidden bg-gradient-to-b from-pitch-700 to-pitch-900 border border-gray-600 shadow-gold-glow flex flex-col p-4 select-none transform transition-transform hover:scale-[1.02]">
      
      {/* Overlay de brillo (Glassmorphism sutil) */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
      
      {/* Header Carta */}
      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col items-center">
          <span className="text-5xl font-display font-black text-neon-gold drop-shadow-md">88</span>
          <span className="text-xs font-bold tracking-widest text-gray-300 uppercase">MED</span>
        </div>
        {/* Placeholder del escudo del equipo principal */}
        <div className="w-10 h-10 bg-pitch-800 rounded-full border border-gray-500 flex items-center justify-center shadow-lg">🛡️</div>
      </div>

      {/* Avatar Jugador */}
      <div className="flex-1 flex items-end justify-center z-10 -mt-8 relative">
        <div className="w-36 h-36 bg-pitch-800 rounded-full border-[3px] border-neon-gold mb-2 overflow-hidden shadow-lg relative">
           {/* La imagen viene pre-comprimida en WebP desde el Backend */}
           <img src="https://i.pravatar.cc/150?img=11" alt="Avatar Jugador" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Stats e Info */}
      <div className="text-center z-10 border-t border-gray-600 pt-3 bg-gradient-to-t from-pitch-900 to-transparent -mx-4 px-4 pb-2">
        <h2 className="text-2xl font-display font-bold uppercase tracking-wider text-white">Riquelme</h2>
        
        {/* Grilla de Métricas Reales */}
        <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] text-gray-400 font-bold uppercase">
          <div className="flex flex-col items-center bg-pitch-800 rounded py-1 border border-pitch-700">
            <span className="text-lg text-white font-display">120</span>
            <span>Goles</span>
          </div>
          <div className="flex flex-col items-center bg-pitch-800 rounded py-1 border border-pitch-700">
            <span className="text-lg text-white font-display">45</span>
            <span>Partidos</span>
          </div>
          <div className="flex flex-col items-center bg-pitch-800 rounded py-1 border border-pitch-700">
            <span className="text-lg text-neon-gold font-display">10</span>
            <span>MVP</span>
          </div>
        </div>
      </div>
    </div>
  );
};
