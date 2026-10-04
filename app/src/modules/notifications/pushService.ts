import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from '@/core/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeZ2lgtsY299t5y8L3A3VbA0qW4_3j1jD-_Z35_aQ'; // This must be the actual VAPID key from Firebase Console for web push.

export const requestNotificationPermission = async (userId: string) => {
  if (!messaging) return;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
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
