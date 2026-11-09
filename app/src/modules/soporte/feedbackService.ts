import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/core/firebase';

export type TipoFeedback = 'bug' | 'sugerencia' | 'general';

export interface NuevoFeedback {
  usuarioUid: string;
  usuarioNombre: string;
  usuarioEmail?: string | null;
  usuarioRol?: string;
  tipo: TipoFeedback;
  mensaje: string;
  ruta?: string;
  userAgent?: string;
}

export async function enviarFeedback(datos: NuevoFeedback): Promise<string> {
  const colRef = collection(db, 'feedbacks');
  const docRef = await addDoc(colRef, {
    ...datos,
    estado: 'PENDIENTE',
    creadoEn: serverTimestamp(),
    fechaISO: new Date().toISOString(),
  });
  return docRef.id;
}
