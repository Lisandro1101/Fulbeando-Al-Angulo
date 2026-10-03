// @ts-ignore
import { getDatabase, ref, set, push, onValue, query, limitToLast, serverTimestamp, off } from 'firebase/database';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

// Inicialización genérica
const db = {} as any; // Reemplazar con: const db = getDatabase();

/**
 * Inicializa la sala de chat. 
 * NOTA: Esta función idealmente debe correrse desde una Cloud Function cuando el estado del match pasa a "accepted".
 */
export const initMatchChat = async (matchId: string, captainAId: string, captainBId: string): Promise<void> => {
  const metaRef = ref(db, `match_chats/${matchId}/meta`);
  
  await set(metaRef, {
    status: 'OPEN',
    participants: {
      [captainAId]: true,
      [captainBId]: true
    }
  });
};

/**
 * Escucha los últimos 30 mensajes con retorno de Cleanup (Vital para evitar fugas de RAM y Datos).
 */
export const subscribeToMessages = (
  matchId: string, 
  callback: (messages: ChatMessage[]) => void
): () => void => {
  // REGLA OBLIGATORIA: limitToLast(30)
  const messagesRef = query(
    ref(db, `match_chats/${matchId}/messages`),
    limitToLast(30)
  );

  const onDataChange = onValue(messagesRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    
    // Convertir de Map de RTDB a Array plano y ordenado cronológicamente
    const parsed = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    })).sort((a, b) => a.timestamp - b.timestamp);
    
    callback(parsed);
  });

  // Retornamos la función desuscriptora para el componentWillUnmount / useEffect cleanup
  return () => {
    off(messagesRef, 'value', onDataChange);
  };
};

/**
 * Envío optimizado de mensajes con validación client-side
 */
export const sendMessage = async (
  matchId: string, 
  senderId: string, 
  senderName: string, 
  text: string
): Promise<void> => {
  const trimmedText = text.trim();
  
  if (!trimmedText) return;
  
  // Validación de UI temprana para evitar error de red tonto
  if (trimmedText.length > 500) {
    throw new Error('Mensaje demasiado largo (Máx 500 caracteres).');
  }

  const messagesRef = ref(db, `match_chats/${matchId}/messages`);
  await push(messagesRef, {
    senderId,
    senderName,
    text: trimmedText,
    timestamp: serverTimestamp() // Tiempo oficial del servidor de Firebase
  });
};
