export type PlayerRole = 'GK' | 'DEF' | 'MID' | 'FWD' | 'DT';

export interface PlayerStats {
  goals: number;
  matchesPlayed: number;
  mvpCount: number;
  fairPlayIndex: number;
}

export interface PlayerProfile {
  id: string;
  displayName: string;
  avatarUrl: string;
  role: PlayerRole;
  stats: PlayerStats;
  rating: number;
  teamIds: string[]; // IDs de los equipos a los que pertenece para facilitar las queries
}

// -------------------------------------------------------------
// SECRETO DEL AHORRO (COSTO CERO EN LECTURAS):
// Snapshot desnormalizado que vivirá DENTRO del documento Team.
// No hay que hacer 1 query extra por cada jugador para pintar el equipo.
// -------------------------------------------------------------
export interface TeamMemberSnapshot {
  id: string;
  displayName: string;
  avatarUrl: string;
  dorsal: number;
  role: PlayerRole;
  joinedAt: number;
}

export interface Team {
  id: string;
  name: string;
  shieldUrl: string; // Logo subido a Cloudflare R2
  captainId: string;
  zone: string; // Ej: 'CABA', 'GBA Norte'
  rating: number;
  inviteCode: string; // Código alfanumérico único
  members: TeamMemberSnapshot[]; // ARRAY MÁGICO: Aquí viven las fotos y nombres
  createdAt: number;
}
