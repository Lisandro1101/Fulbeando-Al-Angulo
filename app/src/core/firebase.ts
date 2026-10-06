import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import { appEnv, faltaConfigFirebase } from "@/core/config";

// Configuracion leida de .env.local / .env.production via @/core/config, para que
// la conexion a emuladores y la de Firebase real salgan de la misma fuente.
// No se tira aca un error: si se tira, el modulo revienta antes de que App.tsx
// pueda pintar su pantalla de error. La falta de config se reporta en consola y
// App.tsx la muestra en pantalla.
const env = appEnv();
const faltantes = faltaConfigFirebase();
if (faltantes.length > 0) {
  console.error(
    `Falta configuracion de Firebase en el .env: ${faltantes.join(", ")}. ` +
      `Copiá .env.example a .env.local y completá los valores.`,
  );
}

const firebaseConfig = env.firebase;

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios como instancias consistentes
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export const messaging = typeof window !== 'undefined' && 'serviceWorker' in navigator ? getMessaging(app) : null;

// Conectar a la suite de emuladores solo cuando VITE_USE_EMULATORS lo pide.
// Con la flag en false se habla con el proyecto real, en dev y en build alike.
if (env.useEmulators) {
  const emulatorHost = "127.0.0.1";

  // Guard para evitar reconexiones múltiples en HMR de Vite
  if (!(globalThis as any)._firebaseEmulatorsConnected) {
    console.info("🔌 VITE_USE_EMULATORS=true: conectando a Firebase Local Emulator Suite...");

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
} else if (import.meta.env.DEV) {
  console.info("☁️  VITE_USE_EMULATORS=false: conectando al proyecto real de Firebase.");
}

export { app };
