import React, { useState } from 'react';
import { AppLayout } from '../ui/AppLayout';
import { useSesion } from '@/modules/auth/useSesion';

// Importar los nuevos componentes
import { WelcomeCard } from '@/modules/onboarding/components/WelcomeCard';
import { TeamCreationForm } from '@/modules/teams/components/TeamCreationForm';
import { RadarFloatingCard } from '@/modules/radar/components/RadarFloatingCard';

export default function AlAnguloHome() {
  const { usuario, cargando } = useSesion();
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showRadarCard, setShowRadarCard] = useState(false);

  if (cargando) {
    return <div className="flex h-screen items-center justify-center bg-pitch-900 text-neon-green">Cargando la cancha...</div>;
  }

  return (
    <AppLayout showAds={false}>
      <div className="p-4 space-y-6 pb-24">
        
        {/* VISTA 1: ONBOARDING / BIENVENIDA */}
        {!showTeamForm && (
          <section>
            <WelcomeCard 
              user={usuario as any || { displayName: 'Jugador', stats: { partidosJugados: 0, goles: 0, fairPlayScore: 5.0 } }}
              onShare={() => alert("Compartiendo ficha...")}
              onCreateTeam={() => setShowTeamForm(true)}
              onExploreRadar={() => setShowRadarCard(true)}
            />
          </section>
        )}

        {/* VISTA 2: CREACIÓN DE EQUIPO */}
        {showTeamForm && (
          <section className="relative">
            <button onClick={() => setShowTeamForm(false)} className="absolute -top-10 left-0 text-amber-500 font-bold text-sm">
              ← Volver
            </button>
            <TeamCreationForm 
              isLoading={false}
              onSubmit={(data) => {
                alert(`Creando equipo: ${data.name}`);
                setShowTeamForm(false);
              }}
            />
          </section>
        )}

        {/* DEMO RADAR FLOATING CARD */}
        {showRadarCard && (
          <RadarFloatingCard 
            user={{ uid: 'user-1', displayName: 'Matias El Rústico', stats: { partidosJugados: 120, goles: 5, fairPlayScore: 3.5 } } as any}
            onClose={() => setShowRadarCard(false)}
            onInviteToMatch={() => alert("Invitado al partido de hoy!")}
            onRecruit={() => alert("Fichado para el equipo!")}
          />
        )}
      </div>
    </AppLayout>
  );
}
