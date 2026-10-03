export type SurfaceType = 'SYNTHETIC' | 'NATURAL_GRASS' | 'INDOOR' | 'CEMENT';
export type VenueSubscription = 'ACTIVE' | 'TRIAL' | 'INACTIVE';
export type VenuePinType = 'SPONSORED_VENUE' | 'REGULAR_VENUE'; 

export interface FieldInfo {
  id: string;
  name: string; // ej: "Cancha 1", "La Bombonerita"
  modality: 'F5' | 'F7' | 'F9' | 'F11';
  surface: SurfaceType;
  isCovered: boolean; // Techada
  basePrice: number; 
}

export interface Venue {
  id: string;
  name: string;
  logoUrl: string;
  ownerId: string; // Referencia al Admin/Dueño que carga resultados B2B
  
  // Instalaciones
  fields: FieldInfo[];
  amenities: string[]; // ['Wifi', 'Vestuarios', 'Parrilla', 'Bar', 'Estacionamiento']
  
  // B2B y Reputación 
  subscriptionState: VenueSubscription;
  reputationScore: number; // Equipos califican el estado del pasto, la pelota, etc.
  
  // Geo data (Motor de Búsqueda)
  lat: number;
  lng: number;
  geohash: string;
  
  // Meta UI: Le avisa al renderizador de Mapas qué Asset de Pin usar
  pinType: VenuePinType; 
}
