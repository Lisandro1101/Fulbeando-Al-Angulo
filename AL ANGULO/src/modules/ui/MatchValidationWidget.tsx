import React from 'react';

/**
 * WIDGET DE VALIDACIÓN DE RESULTADOS
 * Interfaz hiper-directa (cero fricción) para confirmar o rechazar partidos.
 */
export const MatchValidationWidget = () => {
  return (
    <div className="bg-pitch-800 rounded-2xl p-5 border border-pitch-700 shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-full max-w-sm mx-auto">
      
      {/* Header del modal */}
      <div className="text-center mb-5">
        <div className="inline-block bg-orange-500/20 text-neon-orange px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2">
          Acción Requerida
        </div>
        <h3 className="text-xl font-display font-bold text-white leading-tight">Validar Resultado</h3>
        <p className="text-xs text-gray-400 mt-1">El capitán rival subió el marcador. Confirmá antes de las 24hs o se auto-aprobará.</p>
      </div>

      {/* Marcador Visual Titánico */}
      <div className="flex justify-between items-center bg-pitch-900 rounded-xl p-6 mb-6 shadow-inner border border-pitch-800">
        <div className="flex flex-col items-center flex-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Vos</span>
          <span className="text-6xl font-display font-black text-gray-300">2</span>
        </div>
        
        <span className="text-3xl text-gray-700 font-black">-</span>
        
        <div className="flex flex-col items-center flex-1">
          <span className="text-xs font-bold text-neon-green uppercase tracking-widest mb-1">Ganador</span>
          <span className="text-6xl font-display font-black text-neon-green drop-shadow-[0_0_10px_rgba(0,255,102,0.4)]">4</span>
        </div>
      </div>

      {/* CTAs Ergonómicos (Dedo pulgar) */}
      <div className="flex space-x-3">
        <button className="flex-1 bg-transparent border border-gray-600 text-gray-300 py-4 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors active:scale-95">
          Apelar Fraude
        </button>
        <button className="flex-1 bg-neon-green text-pitch-900 py-4 rounded-xl font-black text-sm uppercase shadow-neon-green transition-transform active:scale-95">
          Confirmar
        </button>
      </div>
    </div>
  );
};
