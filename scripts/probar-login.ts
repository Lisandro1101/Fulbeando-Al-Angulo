/**
 * PRUEBA DE LOGIN CONTRA LOS EMULADORES, por el mismo camino que el navegador.
 *
 * `scripts/verificar-seed.ts` mira los datos con el Admin SDK y sale verde. Eso
 * NO demuestra que se pueda entrar a la app: el login del navegador lo hace el
 * SDK de cliente, contra el emulador de Auth, con la configuracion de
 * `app/.env.local`. Si el seed y el bundle discrepan en projectId o en apiKey,
 * el seed pasa y el login responde `auth/user-not-found`.
 *
 * Ese desvio se custo una tarde, asi que queda este chequeo que camina el
 * mismo camino que `app/src/modules/auth/servicio.ts`:
 *
 *   1. lee `app/.env.local` (no variables sueltas de consola),
 *   2. `initializeApp` con esa config,
 *   3. `connectAuthEmulator`,
 *   4. `signInWithPassword` con las cuentas del seed.
 *
 *   npx tsx scripts/probar-login.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { PROJECT_ID } from './proyecto-emulador'

const RAIZ = resolve(process.cwd())

/** Lee `app/.env.local` igual que Vite: sin comillas, con `trim`. */
const leerEnvLocal = (): Record<string, string> => {
  const crudo = readFileSync(resolve(RAIZ, 'app/.env.local'), 'utf8')
  const salida: Record<string, string> = {}
  for (const linea of crudo.split(/\r?\n/)) {
    const t = linea.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    salida[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return salida
}

const CLAVES = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'] as const

/** Cuentas del seed: un jugador con equipo, uno sin equipo y un dueno de predio. */
const CUENTAS = [
  { rol: 'jugador', email: 'lio@alangulo.com' },
  { rol: 'jugador libre', email: 'distinto@fulbeando.com' },
  { rol: 'dueno_predio', email: 'dueno@fulbeando.com' },
]

const PASSWORD = 'password123'

async function main() {
  const env = leerEnvLocal()

  const faltantes = CLAVES.filter((c) => !env[`VITE_FIREBASE_${c.replace(/([A-Z])/g, '_$1').toUpperCase()}`])
  if (faltantes.length > 0) {
    console.error(`\n  app/.env.local incompleto. Faltan:\n${faltantes.join('\n')}\n`)
    process.exitCode = 1
    return
  }

  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }

  console.log(`\n  Login contra emuladores`)
  console.log(`  projectId (app/.env.local) : ${firebaseConfig.projectId}`)
  console.log(`  projectId (proyecto comun) : ${PROJECT_ID}`)
  console.log(`  projectId (Admin/seed)     : ${PROJECT_ID}`)
  console.log(`  VITE_USE_EMULATORS         : ${env.VITE_USE_EMULATORS}\n`)

  if (firebaseConfig.projectId !== PROJECT_ID) {
    console.error(
      `  projectId desincronizado entre la app y el seed: la app usaria\n` +
        `  "${firebaseConfig.projectId}" y el seed escribio en "${PROJECT_ID}".\n` +
        `  Los emuladores los guardan aparte: el login va a fallar con\n` +
        `  auth/user-not-found aunque el seed haya terminado bien.\n`,
    )
    process.exitCode = 1
    return
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })

  let fallos = 0
  for (const cuenta of CUENTAS) {
    try {
      const cred = await signInWithEmailAndPassword(auth, cuenta.email, PASSWORD)
      console.log(`  OK    ${cuenta.rol.padEnd(15)} ${cuenta.email} -> uid=${cred.user.uid}`)
      await signOut(auth)
    } catch (e) {
      fallos++
      const err = e as { code?: string; message?: string }
      console.error(`  FALLA ${cuenta.rol.padEnd(15)} ${cuenta.email} -> ${err.code ?? err.message}`)
      if (err.code === 'auth/user-not-found') {
        console.error(
          `        Corre ` +
            `\`npx tsx scripts/seed-emuladores.ts\` contra ESTE emulador:\n` +
            `        si el seed corrio contra otro proyecto, o contra otro emulador,\n` +
            `        el usuario existe ahi pero no aqui.`,
        )
      }
    }
  }

  console.log(fallos === 0 ? `\n  Login OK en las 3 ramas\n` : `\n  ${fallos} de ${CUENTAS.length} cuentas no pudieron entrar\n`)
  process.exitCode = fallos === 0 ? 0 : 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})