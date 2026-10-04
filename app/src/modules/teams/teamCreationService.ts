import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/core/firebase';
import { COLECCIONES } from '@/core/config';

export interface TeamCreationData {
  name: string;
  shieldUrl?: string; // Optimizada a WebP previamente
  modalidadBase: string; // F5, F7, F11
}

/**
 * Crea un equipo y convierte al usuario en Capitán.
 * Utiliza una Transacción para asegurar atomicidad.
 */
export const createTeamAsCaptain = async (
  uid: string,
  userDisplayName: string,
  teamData: TeamCreationData
): Promise<string> => {
  const teamId = `team-${Date.now()}-${uid.slice(0,5)}`;
  const teamRef = doc(db, 'teams', teamId);
  const userRef = doc(db, COLECCIONES.usuarios, uid);

  await runTransaction(db, async (transaction) => {
    // 1. Verificamos que el usuario exista
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("Usuario no encontrado");
    }

    // 2. Creamos el equipo con el capitan como primer miembro desnormalizado
    transaction.set(teamRef, {
      id: teamId,
      name: teamData.name,
      shieldUrl: teamData.shieldUrl || null,
      modalidadBase: teamData.modalidadBase,
      captainId: uid,
      stats: { wins: 0, losses: 0, draws: 0 },
      members: [
        {
          uid,
          name: userDisplayName,
          role: 'CAPTAIN', // Jerarquía
        }
      ],
      createdAt: serverTimestamp(),
    });

    // 3. Actualizamos al usuario para marcarlo como Capitan de este equipo
    // El rol en sistema sigue siendo "jugador", pero a nivel deportivo es CAPTAIN de su team.
    transaction.update(userRef, {
      teamId: teamId,
      teamRole: 'CAPTAIN'
    });
  });

  return teamId;
};
