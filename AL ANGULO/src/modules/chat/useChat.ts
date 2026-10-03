import { useState, useEffect } from 'react';
// @ts-ignore
import { getDatabase, ref, push, onValue, query, limitToLast, serverTimestamp } from 'firebase/database';

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

/**
 * HOOK DE SINCRONIZACIÓN DE CHAT (Realtime Database)
 * Consume escasísimos Kilobytes en lugar de Document Reads.
 */
export const useMatchChat = (matchId: string, currentUserId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const db = getDatabase(); // Asume la app de Firebase ya inicializada
    
    // REGLA DE AHORRO EXTREMO: limitToLast(30)
    // Aunque el chat tenga 400 mensajes discutiendo la cancha, el usuario 
    // al entrar solo descargará los últimos 30 en memoria.
    const messagesRef = query(
      ref(db, `match_chats/${matchId}/messages`),
      limitToLast(30)
    );

    // Conexión WebSockets persistente súper liviana
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Transformar el mapa nativo de RTDB a un Array plano
        const parsed = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        setMessages(parsed);
      } else {
        setMessages([]);
      }
    });

    // Cierre de Socket silencioso al desmontar
    return () => unsubscribe();
  }, [matchId]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    setIsSending(true);
    try {
      const db = getDatabase();
      const messagesRef = ref(db, `match_chats/${matchId}/messages`);
      
      await push(messagesRef, {
        senderId: currentUserId,
        text: text.trim(),
        timestamp: serverTimestamp() // Sello de tiempo infalsificable
      });
    } catch (error) {
      console.error('[Al Ángulo Chat] Error emitiendo mensaje:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  return { messages, sendMessage, isSending };
};
