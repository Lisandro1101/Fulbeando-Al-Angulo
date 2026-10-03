import { initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage'
import { appEnv, faltaConfigFirebase } from './config'

let cache: {
  app: FirebaseApp
  auth: Auth
  db: Firestore
  storage: FirebaseStorage
} | null = null

/**
 * Unica instancia de los servicios de Firebase. Si faltan variables de entorno
 * tira un error explicito en vez de fallar en silencio al primer query.
 */
export function firebase() {
  if (cache) return cache

  const env = appEnv()
  const faltantes = faltaConfigFirebase()
  if (faltantes.length > 0) {
    throw new Error(
      `Falta configuracion de Firebase en .env: ${faltantes.join(', ')}. ` +
        'Copiá .env.example a .env.local y completalo.',
    )
  }

  const app = initializeApp(env.firebase)
  const auth = getAuth(app)
  const db = getFirestore(app)
  const storage = getStorage(app)

  if (env.useEmulators) {
    const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1'
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
    connectFirestoreEmulator(db, host, 8080)
    connectStorageEmulator(storage, host, 9199)
  }

  cache = { app, auth, db, storage }
  return cache
}

export const db = (): Firestore => firebase().db
export const auth = (): Auth => firebase().auth
export const storage = (): FirebaseStorage => firebase().storage