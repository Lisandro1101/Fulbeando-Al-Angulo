export type ReviewerType = 'VENUE' | 'TEAM';
export type TargetType = 'VENUE' | 'TEAM';

export interface Scores {
  overall: number; // 1 a 5 estrellas
  
  // Específicos si Target == TEAM (Cancha evaluando a los Jugadores)
  punctuality?: number;
  fairPlay?: number;
  
  // Específicos si Target == VENUE (Equipos evaluando las Instalaciones)
  fieldCondition?: number;
  facilities?: number;
}

export interface Review {
  id: string; // Se formará con: `${matchId}_${reviewerUserId}` para asegurar idempotencia
  matchId: string;
  reviewerUserId: string; // El UID de Firebase de quien ejecuta la acción
  reviewerId: string; // Puede ser el ID del equipo o de la cancha que emite el review
  reviewerType: ReviewerType; 
  targetId: string; // El equipo o cancha que recibe la calificación
  targetType: TargetType;
  scores: Scores;
  comment: string;
  createdAt: number;
}
