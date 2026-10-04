import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

// Configuración de Firebase (asegurate de tener tus variables de entorno configuradas)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios como instancias consistentes
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export const messaging = typeof window !== 'undefined' && 'serviceWorker' in navigator ? getMessaging(app) : null;

// Conectar a la suite de emuladores locales en entorno de desarrollo
if (import.meta.env.DEV) {
  const emulatorHost = "localhost";
  
  // Guard para evitar reconexiones múltiples en HMR de Vite
  if (!(globalThis as any)._firebaseEmulatorsConnected) {
    console.info("🔌 Conectando a Firebase Local Emulator Suite...");
    
    // Conectar Auth (puerto 9099, deshabilitando warnings duplicados)
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    
    // Conectar Firestore (puerto 8080)
    connectFirestoreEmulator(db, emulatorHost, 8080);
    
    // Conectar Realtime Database para el chat (puerto 9000)
    connectDatabaseEmulator(rtdb, emulatorHost, 9000);

    // Conectar Storage (puerto 9199 por defecto en emuladores)
    connectStorageEmulator(storage, emulatorHost, 9199);
    
    (globalThis as any)._firebaseEmulatorsConnected = true;
  }
}

export { app };
