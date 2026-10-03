export type MatchModality = 'F5' | 'F7' | 'F11';
export type CourtStatus = 'HAS_COURT' | 'LOOKING_TO_SHARE'; // Tienen cancha propia vs Buscan pagarla a medias

export interface Challenge {
  id: string;
  creatorId: string;
  challengerTeamId: string;
  challengerTeamName: string;
  challengerTeamShieldUrl: string;
  modality: MatchModality;
  courtStatus: CourtStatus;
  dateTimeUnix: number; // Fecha y hora propuesta para el partido
  status: 'OPEN' | 'ACCEPTED' | 'CANCELLED';
  
  // ==========================================
  // GEO DATA PARA EL MOTOR DE BÚSQUEDA
  // ==========================================
  lat: number;
  lng: number;
  geohash: string; // Generado al crear el documento usando geofire-common
}
