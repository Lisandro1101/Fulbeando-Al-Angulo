import React from 'react';
import { Outlet, useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { MenuNavegacion } from '@/modules/ui/MenuNavegacion';
import { X } from 'lucide-react';

// Modales que queremos que floten en desktop
import CargaDeSena from '@/modules/turnos/pantallas/CargaDeSena';
import { Screen6LaunchChallenge, Screen7MyTeam, Screen8VenueRegistration } from '@/modules/ui/Screens';

const FlotanteModal = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8 animate-fade-in">
      <div className="relative w-full max-w-xl h-full md:h-auto md:max-h-[85vh] overflow-hidden rounded-3xl shadow-2xl bg-zinc-950 border border-zinc-800 animate-slide-up flex flex-col">
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 z-[300] bg-zinc-900/80 hover:bg-zinc-800 p-2 rounded-full text-white transition-colors"
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

export const AppLayout = () => {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: Location };

  // Decide if we should render background + modal
  // We only do this if we actually match one of the floating routes and have a backgroundLocation
  const esModal = Boolean(state?.backgroundLocation);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-zinc-950 text-white font-sans">
      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <MenuNavegacion />

      {/* Main Content Area */}
      <main className="flex-1 h-full relative overflow-hidden md:pl-64">
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
