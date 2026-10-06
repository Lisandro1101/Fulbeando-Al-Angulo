/**
 * Diagnostico temporal: iniciar sesion con el MISMO SDK que usa el navegador,
 * para separar "el seed escribio en el lugar equivocado" de "mi prueba por REST
 * esta resolving otro proyecto".
 */
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth'
import { initializeApp } from 'firebase/app'

const projectId = process.env.VITE_FIREBASE_PROJECT_ID
console.log('VITE_FIREBASE_PROJECT_ID =', projectId)
console.log('VITE_USE_EMULATORS =', process.env.VITE_USE_EMULATORS)

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
})

const auth = getAuth(app)
if (process.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
}

async function main(): Promise<void> {
  for (const email of ['distinto@fulbeando.com', 'dueno@fulbeando.com', 'lio@alangulo.com']) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, 'password123')
      console.log(`  OK   ${email} -> uid=${cred.user.uid}`)
    } catch (e: any) {
      console.log(`  FAIL ${email} -> ${e.code} / ${e.message}`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})