import React, { useState, useRef, useEffect } from 'react';
import { subscribeToMessages, sendMessage, ChatMessage } from './chatService';

export const ChatRoom = ({ matchId, currentUserId, currentUserName, rivalName, matchDate }: any) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // MANEJO ESTRICTO DEL CICLO DE VIDA (Previene Consumo Fantasma de 4G)
  useEffect(() => {
    // Al montarse, conectamos el socket web
    const unsubscribe = subscribeToMessages(matchId, (msgs) => {
      setMessages(msgs);
    });

    // Al desmontarse (cuando el usuario cierra la pantalla), CORTAMOS el tráfico.
    return () => {
      unsubscribe();
    };
  }, [matchId]);

  // Auto-scroll sedoso
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length > 500) return alert('Máximo 500 caracteres.');
    
    setIsSending(true);
    try {
      await sendMessage(matchId, currentUserId, currentUserName, text);
      setText(''); // Vaciamos input al confirmar entrega
    } catch (error) {
      console.error('Fallo al enviar:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-pitch-900 font-sans absolute inset-0 z-50">
      
      {/* Header Contextual (Mobile First) */}
      <div className="bg-pitch-800 px-4 py-3 border-b border-pitch-700 flex flex-row items-center shadow-md shrink-0">
        <button className="text-gray-400 mr-4 text-2xl active:scale-90 opacity-80">←</button>
        <div className="w-12 h-12 bg-pitch-900 border border-gray-600 rounded-full flex items-center justify-center mr-3">
          ⚽
        </div>
        <div className="flex flex-col">
          <h2 className="text-white font-bold leading-none text-lg mb-1">{rivalName}</h2>
          <span className="text-[10px] text-neon-green uppercase font-black tracking-widest">{matchDate}</span>
        </div>
      </div>

      {/* Caja de Conversación (Fondo Nocturno) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-pitch-900 to-[#0A0D14]">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-xs mt-10">La sala de coordinación está abierta. ¡Saludá al rival!</div>
        )}
        
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && <span className="text-[9px] text-gray-500 mb-1 ml-1">{msg.senderName}</span>}
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl relative shadow-sm 
                ${isMe 
                  ? 'bg-neon-green text-pitch-900 rounded-br-sm' 
                  : 'bg-pitch-800 text-gray-200 border border-pitch-700 rounded-bl-sm'}`
              }>
                <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                <span className={`text-[9px] mt-1.5 block text-right font-bold ${isMe ? 'text-pitch-800 opacity-60' : 'text-gray-500'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        {/* Checkpoint de Scrolleo */}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Zócalo de Escritura (Protegido del Notch) */}
      <div className="bg-pitch-800 p-3 border-t border-pitch-700 shrink-0 pb-safe-bottom">
        <form onSubmit={handleSend} className="flex space-x-2 items-center">
          <input 
            type="text" 
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 bg-pitch-900 border border-gray-600 text-white rounded-full px-4 py-3.5 focus:outline-none focus:border-neon-green transition-all text-sm placeholder-gray-500"
            placeholder="Escribí un mensaje..."
          />
          <button 
            type="submit" 
            disabled={!text.trim() || isSending}
            className="bg-neon-green text-pitch-900 w-12 h-12 shrink-0 rounded-full flex items-center justify-center shadow-neon-green transition-transform active:scale-90 disabled:opacity-30 disabled:shadow-none"
          >
            {/* Play icon simulado */}
            <span className="font-black text-lg ml-1">▶</span>
          </button>
        </form>
      </div>
      
    </div>
  );
};
