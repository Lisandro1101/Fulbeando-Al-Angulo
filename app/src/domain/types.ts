/**
 * Esquema TypeScript - "Al Ángulo"
 * Tipos de Dominio Unificados
 */

export type Role = 'player' | 'venue_owner' | 'pending_venue' | 'superadmin';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: Role;
  
  // Jugador
  stats?: {
    matchesPlayed: number;
    goals: number;
    fairPlayScore: number;
  };
  position?: 'ARQ' | 'DEF' | 'MED' | 'DEL';
  strongFoot?: 'Derecho' | 'Zurdo' | 'Ambidiestro';
  birthDate?: string;
  location?: string;
  
  // Agente Libre
  isAvailable?: boolean;
  availableUntil?: number; // Timestamp
  
  // Referencias
  teams?: string[]; // IDs de equipos a los que pertenece
}

export interface TeamMember {
  uid: string;
  name: string;
  role: 'CAPTAIN' | 'PLAYER' | 'DELEGATE';
  position: 'ARQ' | 'DEF' | 'MED' | 'DEL';
  avatarUrl?: string;
  rating?: number;
}

export interface Team {
  id: string;
  name: string;
  shieldUrl?: string;
  captainId: string;
  members: TeamMember[];
  stats: {
    wins: number;
    losses: number;
    draws: number;
  };
  createdAt: number;
}

export interface Challenge {
  id: string;
  creatorTeamId: string;
  creatorTeamName: string;
  status: 'open' | 'accepted' | 'completed' | 'cancelled';
  matchType: 'F5' | 'F7' | 'F11';
  date: number; // Timestamp
  hasVenue: boolean;
  venueId?: string; // Si ya tienen cancha
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  acceptedByTeamId?: string;
}

export interface Venue {
  id: string;
  ownerUid: string;
  name: string;
  address: string;
  phone: string;
  location: {
    lat: number;
    lng: number;
    geohash: string;
  };
  fields: {
    id: string;
    type: 'F5' | 'F7' | 'F11';
    surface: 'SINTETICO' | 'CESPED' | 'CEMENTO';
    isRoofed: boolean;
  }[];
  photos: string[];
  subscription: {
    status: 'active' | 'pending_payment' | 'inactive';
    plan: 'PREMIUM' | 'BASIC';
  };
  reputation: number; // Basado en reviews
  createdAt: number;
}
