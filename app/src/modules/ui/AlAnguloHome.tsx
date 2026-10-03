import React, { useEffect, useState } from 'react';
import { AppLayout } from '../ui/AppLayout';
import { PlayerCard } from '../ui/PlayerCard';
import { RadarCard } from '../ui/RadarCard';
import { MatchValidationWidget } from '../ui/MatchValidationWidget';
import { useSesion } from '@/modules/auth/useSesion';

export default function AlAnguloHome() {
  const { usuario, cargando } = useSesion();

  // Si el usuario existe, inyectamos sus datos reales; de lo contrario fallback.
  const playerData = {
    displayName: usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Jugador X',
    dorsal: 10,
    role: usuario?.perfilDeportivo?.playerRole || 'FWD',
    stats: usuario?.perfilDeportivo?.stats || { goals: 0, matchesPlayed: 0, mvpCount: 0, fairPlayIndex: 100 },
    rating: usuario?.perfilDeportivo?.rating || 5.0,
    avatarUrl: usuario?.fotoUrl || "https://i.imgur.com/K1U1J6n.jpeg", 
  };

  const mockChallenge = {
    id: "chal-1",
    teamName: "Los Pibes FC",
    shieldUrl: "https://i.imgur.com/K1U1J6n.jpeg",
    matchType: "F5" as const,
    hasVenue: true,
    scheduledAt: Date.now() + 86400000, 
  };

  if (cargando) {
    return <div className="flex h-screen items-center justify-center bg-pitch-900 text-neon-green">Cargando la cancha...</div>;
  }

  return (
    <AppLayout showAds={true}>
      <div className="p-4 space-y-6">
        <header className="mb-6 mt-2 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-white">
              AL ÁNGULO
            </h1>
            <p className="text-neon-green text-xs font-bold uppercase tracking-widest mt-1">El Potrero Digital</p>
          </div>
          {usuario && <span className="text-xs text-gray-400">Hola, {usuario.nombre}</span>}
        </header>

        <section>
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Tu Ficha Oficial</h2>
          <PlayerCard {...playerData} />
        </section>

        <section>
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Radar Cercano (Live)</h2>
          <RadarCard {...mockChallenge} />
        </section>

        <section>
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Acción Requerida</h2>
          <MatchValidationWidget localScore={5} visitorScore={4} rivalName="Real Bañil" expiresAt={Date.now() + 3600000} onConfirm={() => alert("Confirmado en Firebase")} onAppeal={() => alert("Apelado a SuperAdmin")} />
        </section>
      </div>
    </AppLayout>
  );
}
