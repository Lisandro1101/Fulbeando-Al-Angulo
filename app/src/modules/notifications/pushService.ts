import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from '@/core/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const requestNotificationPermission = async (userId: string) => {
  if (!messaging || !VAPID_KEY || VAPID_KEY.startsWith('BEl62iUY')) return;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.getRegistration();
      const currentToken = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });
      if (currentToken) {
        // Save the token to the user document in Firestore
        const userRef = doc(db, 'usuarios', userId);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(currentToken)
        });
        console.log('FCM Token saved successfully');
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } else {
      console.log('Notification permission denied.');
    }
  } catch (err) {
    console.error('An error occurred while requesting permission ', err);
  }
};

export const listenToForegroundMessages = (callback: (payload: any) => void) => {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};

export interface DatosPayloadPostulacion {
  partidoId: string;
  jugadorId: string;
  nombreJugador?: string;
  titulo?: string;
  cuerpo?: string;
}

/**
 * Escucha notificaciones push en primer plano específicamente para nuevas postulaciones.
 * No interfiere con el listener base de Firebase Messaging.
 */
export const escucharNotificacionPostulacion = (
  alRecibir: (datos: DatosPayloadPostulacion) => void
) => {
  return listenToForegroundMessages((payload) => {
    if (payload?.data?.tipo === 'NUEVA_POSTULACION') {
      alRecibir({
        partidoId: payload.data.partidoId,
        jugadorId: payload.data.jugadorId,
        nombreJugador: payload.data.nombreJugador,
        titulo: payload.notification?.title,
        cuerpo: payload.notification?.body,
      });
    }
  });
};

/**
 * Dispara una notificación push nativa del navegador / sistema operativo
 * si el usuario otorgó los permisos correspondientes.
 */
export const dispararNotificacionPushLocal = (titulo: string, opciones?: NotificationOptions) => {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(titulo, opciones);
    } catch {
      // Fallback para Service Worker en PWA móvil
      navigator.serviceWorker?.getRegistration().then((reg) => {
        reg?.showNotification(titulo, opciones);
      }).catch(() => {});
    }
  }
};

