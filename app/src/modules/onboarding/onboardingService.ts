import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/core/firebase';
import { COLECCIONES } from '@/core/config';
import type { Posicion, ModalidadDesafio } from '@/domain';

export interface OnboardingData {
  apodo: string;
  posicion: Posicion;
  pieHabil: 'Derecho' | 'Zurdo' | 'Ambidiestro';
  modalidadPreferida: ModalidadDesafio;
  zonaId: string;
}

/**
 * Completa el perfil del usuario luego del login (Onboarding).
 * Se actualiza en el doc principal del usuario para evitar lecturas N+1 al renderizar.
 */
export const completarOnboardingJugador = async (uid: string, data: OnboardingData) => {
  const userRef = doc(db, COLECCIONES.usuarios, uid);
  
  await updateDoc(userRef, {
    displayName: data.apodo,
    perfilDeportivo: {
      posicion: data.posicion,
      pieHabil: data.pieHabil,
      modalidadPreferida: data.modalidadPreferida,
    },
    zona: data.zonaId,
    // Inicializar stats de carta (estilo FUT)
    stats: {
      partidosJugados: 0,
      goles: 0,
      fairPlayScore: 5.0, // Base
    },
    onboardingCompletado: true,
  });
};

/**
 * Activa o desactiva el modo "Agente Libre" (Disponible para jugar hoy).
 * Establece un TTL de 24 hs usando Timestamp.
 */
export const toggleDisponibilidadAgenteLibre = async (uid: string, isAvailable: boolean) => {
  const userRef = doc(db, COLECCIONES.usuarios, uid);
  
  if (isAvailable) {
    // 24 hs a partir de ahora
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 24);
    
    await updateDoc(userRef, {
      isAvailable: true,
      availableUntil: Timestamp.fromDate(expiration),
    });
  } else {
    await updateDoc(userRef, {
      isAvailable: false,
      availableUntil: null,
    });
  }
};
