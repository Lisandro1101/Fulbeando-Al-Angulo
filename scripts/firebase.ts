/**
 * Correr la CLI de Firebase con un projectId explicito, sin depender de la
 * cache global de firebase-tools.
 *
 * El problema que motivo este wrapper: firebase-tools guarda en
 * `~/.config/configstore/firebase-tools.json` un `activeProjects` con el ultimo
 * proyecto usado POR CARPETA. Esa cache tiene prioridad sobre `.firebaserc`, y
 * no se puede corregir con `firebase use` cuando el proyecto es solo de
 * emulador, porque no existe en la nube y la CLI responde
 * "Invalid project selection".
 *
 * El efecto era invisible: `npm run dev:all` levantaba los emuladores en el
 * namespace `fulbeando-al-angulo-26`, el seed escribia en `fulbeando-demo`, la
 * app authenticaba contra `fulbeando-demo`, `seed:verify` daba todo verde y el
 * login fallaba con `auth/user-not-found`.
 *
 * El proyecto se resuelve en este orden:
 *   1. `--project X` en los argumentos, si viene.
 *   2. `FULBEANDO_FIREBASE_PROJECT` (override manual).
 *   3. `PROJECT_ID` de `proyecto-emulador` (`.firebaserc` / `app/.env.local`).
 *
 *   tsx scripts/firebase.ts emulators:start
 *   tsx scripts/firebase.ts emulators:start --only firestore,auth
 *   npm run deploy:hosting
 */
import { spawn } from 'node:child_process'
import {
  PROJECT_ID,
  projectIdDeFirebaserc,
  projectIdDeLaApp,
  projectIdDeProduccion,
} from './proyecto-emulador'

const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('  Uso: tsx scripts/firebase.ts <comando firebase> [args...]')
  process.exit(1)
}

const yaViene = args.some((a, i) => a === '--project' && i + 1 < args.length)
const override = process.env.FULBEANDO_FIREBASE_PROJECT?.trim() || null
const proyecto = yaViene ? null : (override ?? PROJECT_ID)

const finales = proyecto ? ['--project', proyecto, ...args] : args

/**
 * `spawn` con `shell: true` concatena los argumentos sin entrecomillar, asi que
 * un comando con espacios o `&&` (el caso de `emulators:exec "... && ..."`)
 * se parte en varios argumentos y la CLI responde "Too many arguments".
 */
const paraShell = (a: string): string => (/^[\w\-.,:/@=+]+$/.test(a) ? a : `"${a.replace(/"/g, '\\"')}"`)

console.log(`\n  Proyecto: ${proyecto ?? '(el que ya venia en --project)'}`)
if (!yaViene) {
  console.log(`    .firebaserc    -> ${projectIdDeFirebaserc() ?? '(sin archivo)'}`)
  console.log(`    app/.env.local -> ${projectIdDeLaApp() ?? '(sin archivo)'}`)
  console.log(`    override env   -> ${override ?? '(ninguno)'}`)
}
console.log(`    firebase ${finales.join(' ')}\n`)

const hijo = spawn('firebase', finales.map(paraShell), { stdio: 'inherit', shell: true })

hijo.on('error', (e) => {
  console.error(`\n  No se pudo lanzar firebase: ${(e as Error).message}`)
  process.exitCode = 1
})

hijo.on('exit', (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 0)
})