// Omitimos la importacion real de db de Firebase para este boilerlpate, asumimos SDK v9+
import { doc, getDoc, runTransaction, writeBatch, collection } from 'firebase/firestore';
import { PlayerProfile, Team, TeamMemberSnapshot } from '../../domain/types';

// Mock temporal hasta conectar tu modulo real
const db = {} as any; 

// =======================================================
// MANEJO LIMPIO DE ERRORES
// =======================================================
export class TeamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TeamError';
  }
}

// =======================================================
// SERVICIOS
// =======================================================

/**
 * CREAR EQUIPO (COSTO: 2 Escrituras, 0 Lecturas N+1)
 * Utiliza un Batch para garantizar que si falla la actualización del perfil
 * no se cree un equipo fantasma huérfano.
 */
export const createTeam = async (
  captainId: string, 
  captainProfile: PlayerProfile, 
  teamData: Omit<Team, 'id' | 'members' | 'createdAt' | 'captainId'>
): Promise<string> => {
  const teamRef = doc(collection(db, 'teams'));
  const userRef = doc(db, 'users', captainId);

  // Inicializar al capitán como primer miembro incrustado
  const initialMember: TeamMemberSnapshot = {
    id: captainId,
    displayName: captainProfile.displayName,
    avatarUrl: captainProfile.avatarUrl, // Servida por Cloudflare R2
    dorsal: 10, // Dorsal inicial sugerido para el capitán creador
    role: captainProfile.role,
    joinedAt: Date.now()
  };

  const newTeam: Team = {
    ...teamData,
    id: teamRef.id,
    captainId,
    members: [initialMember],
    createdAt: Date.now()
  };

  const batch = writeBatch(db);

  // 1. Setear el equipo nuevo
  batch.set(teamRef, newTeam);

  // 2. Agregar el id del equipo a la matriz de equipos del usuario
  // (Asume manipulación a nivel app, en un caso hardcore usaríamos arrayUnion)
  const updatedTeamIds = [...(captainProfile.teamIds || []), teamRef.id];
  batch.update(userRef, { teamIds: updatedTeamIds });

  try {
    await batch.commit();
    return teamRef.id;
  } catch (error) {
    console.error('[Al Ángulo] Error al crear equipo:', error);
    throw new TeamError('Error de servidor al crear la institución.');
  }
};

/**
 * UNIRSE A EQUIPO (COSTO: 1 Lectura, 2 Escrituras transaccionales)
 * Se usa runTransaction porque necesitamos proteger concurrencia:
 * Si 3 personas meten el código a la vez estando el cupo en 21,
 * sólo las 2 primeras entran, el 3ro rebota gracias al bloqueo de transacción.
 */
export const addTeamMember = async (
  teamId: string,
  newMemberProfile: PlayerProfile,
  dorsal: number,
  isDT: boolean = false
): Promise<void> => {
  const teamRef = doc(db, 'teams', teamId);
  const userRef = doc(db, 'users', newMemberProfile.id);

  try {
    await runTransaction(db, async (transaction: any) => {
      const teamSnap = await transaction.get(teamRef);
      
      if (!teamSnap.exists()) {
        throw new TeamError('No encontramos el equipo en nuestra base.');
      }

      const team = teamSnap.data() as Team;
      
      // REGLA ARQUITECTURA: LÍMITES ESTRICTOS (22 jugadores + 1 DT = 23 lugares absolutos)
      const MAX_MEMBERS = 23;
      if (team.members.length >= MAX_MEMBERS) {
        throw new TeamError('El plantel está cerrado. Alcanzó el cupo de 22 jugadores.');
      }

      // Validaciones de negocio puras
      if (team.members.some(m => m.id === newMemberProfile.id)) {
        throw new TeamError('Este crack ya forma parte del plantel.');
      }
      if (team.members.some(m => m.dorsal === dorsal && m.role !== 'DT')) {
        throw new TeamError(`El dorsal ${dorsal} ya tiene dueño.`);
      }

      const newMemberSnap: TeamMemberSnapshot = {
        id: newMemberProfile.id,
        displayName: newMemberProfile.displayName,
        avatarUrl: newMemberProfile.avatarUrl,
        dorsal,
        role: isDT ? 'DT' : newMemberProfile.role,
        joinedAt: Date.now()
      };

      // Inyección al final del array
      transaction.update(teamRef, {
        members: [...team.members, newMemberSnap]
      });

      // Vinculación cruzada de seguridad
      const updatedTeamIds = [...(newMemberProfile.teamIds || []), teamId];
      transaction.update(userRef, {
        teamIds: updatedTeamIds
      });
    });
  } catch (error: any) {
    if (error instanceof TeamError) throw error; // Relanzamos nuestro error puro hacia la UI
    console.error('[Al Ángulo] Concurrencia de transacción:', error);
    throw new TeamError('Los servidores están picados. Intenta en unos segundos.');
  }
};

/**
 * CARGAR FICHA DEL EQUIPO COMPLETA (COSTO: ¡SÓLO 1 LECTURA!)
 * Sin subcolecciones problemáticas, traes el perfil, el escudo y el roster entero 
 * con un solo documento servido en caché.
 */
export const getTeamProfile = async (teamId: string): Promise<Team> => {
  const teamRef = doc(db, 'teams', teamId);
  const teamSnap = await getDoc(teamRef);

  if (!teamSnap.exists()) {
    throw new TeamError('El equipo que buscas ha sido descalificado (No existe).');
  }

  const team = teamSnap.data() as Team;
  
  if (!team.members || team.members.length < 5) {
     console.warn(`[Al Ángulo - Auditoría] El equipo ${teamId} tiene plantilla en infracción (<5).`);
  }

  return team;
};
