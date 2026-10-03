import { VenueSubscription } from '../venues/venueTypes';

// Contexto mínimo necesario para que el sistema decida en base a claims y roles
export interface UserEntitlementContext {
  role: 'PLAYER' | 'VENUE_OWNER';
  venueSubscription?: VenueSubscription; // Relevante sólo si es dueño de cancha
  hasPremiumAdFree?: boolean; // Preparado para Fase 2: "Jugadores Pro sin anuncios"
}

/**
 * MOTOR DE RENDERING PUBLICITARIO
 * Una única fuente de la verdad para determinar si activamos el consumo
 * de red y la UI intrusiva de Ads.
 */
export const shouldRenderAds = (context: UserEntitlementContext): boolean => {
  // 1. Tratamiento VIP B2B: Si el dueño del complejo paga la suscripción o está en Trial,
  // su dashboard y su app JAMÁS le mostrará publicidad. 
  if (context.role === 'VENUE_OWNER' && context.venueSubscription !== 'INACTIVE') {
    return false; // Sin publicidad
  }

  // 2. Escalabilidad futura: Jugadores que adquieran membresía en Fase 2
  if (context.hasPremiumAdFree) {
    return false; // Sin publicidad
  }

  // 3. Comportamiento base (El grueso de "Al Ángulo"):
  // Los jugadores de la red gratuita verán banners nativos e interstitials al armar partidos.
  return true; // Mostrar publicidad
};
