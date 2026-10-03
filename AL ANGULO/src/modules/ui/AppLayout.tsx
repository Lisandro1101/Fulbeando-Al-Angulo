import React from 'react';

/**
 * CORE LAYOUT: Progressive Web App
 * Diseñado ergonómicamente para usarse con el pulgar de una sola mano.
 */
export const AppLayout = ({ children, showAds = true }: { children: React.ReactNode, showAds: boolean }) => {
  return (
    <div className="flex flex-col h-screen bg-pitch-900 text-white font-sans overflow-hidden">
      
      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto pb-safe-bottom scroll-smooth">
        {children}
      </main>

      {/* 
        TRATAMIENTO PUBLICITARIO NO INTRUSIVO
        Unidad de Anuncio Banner anclada encima de la botonera táctil.
        Se apaga por suscripción (showAds = false)
      */}
      {showAds && (
        <div className="h-12 bg-freemium-banner w-full flex items-center justify-center text-[10px] text-gray-600 border-t border-pitch-700">
          ESPACIO PUBLICITARIO ADMOB
        </div>
      )}

      {/* Bottom Navigation Bar (Ergonomía PWA) */}
      <nav className="bg-pitch-800 border-t border-pitch-700 pb-safe-bottom flex justify-around items-center h-16 shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.6)] z-50 relative">
        <NavItem icon="📍" label="Radar" active />
        <NavItem icon="🛡️" label="Equipo" />
        <NavItem icon="⚔️" label="Partidos" />
        <NavItem icon="👤" label="Perfil" />
      </nav>
    </div>
  );
};

// Subcomponente encapsulado para la navegación
const NavItem = ({ icon, label, active = false }: { icon: string, label: string, active?: boolean }) => (
  <button className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-90 ${active ? 'text-neon-green' : 'text-gray-500'}`}>
    <span className="text-xl drop-shadow-md">{icon}</span>
    <span className="text-[9px] uppercase font-bold tracking-widest">{label}</span>
  </button>
);
