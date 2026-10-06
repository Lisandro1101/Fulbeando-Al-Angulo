/**
 * Deploy a Firebase Hosting del proyecto REAL.
 *
 * Hace falta este wrapper porque `firebase deploy` a secas tomaba el proyecto
 * de la cache global de firebase-tools (`activeProjects` en
 * `~/.config/configstore/firebase-tools.json`), no de `.firebaserc`. Con esa
 * cache en `fulbeando-demo` el deploy apuntaria al proyecto equivocado, y con
 * la cache en el proyecto real el emulador local levantaria en el namespace del
 * produccion. Los dos paths tienen que ser explicitos.
 *
 * El proyecto sale de `app/.env.production`, que es de donde la app saca sus
 * propias credenciales: si ese archivo cambia, el deploy lo sigue.
 *
 *   npm run deploy:hosting            -> deploy al hosting del proyecto real
 *   npm run deploy:preview            -> channel deploy "pre-produccion"
 *   npm run deploy:hosting -- --dry   -> imprime el comando y no despliega
 */
import { spawn } from 'node:child_process'
import { projectIdDeProduccion } from './proyecto-emulador'

const PROYECTO = process.env.FULBEANDO_FIREBASE_PROJECT?.trim() || projectIdDeProduccion()

if (!PROYECTO) {
  console.error(
    '\n  No se encontro el proyecto de produccion.\n' +
      '  Se lee VITE_FIREBASE_PROJECT_ID de app/.env.production.\n' +
      '  Sin eso no se sabe a donde desplegar.\n',
  )
  process.exit(1)
}

const dry = process.argv.includes('--dry')
const previsualizacion = process.argv.includes('--preview')
const canal = process.argv[process.argv.indexOf('--preview') + 1]

const args = previsualizacion
  ? ['hosting:channel:deploy', '--project', PROYECTO, canal ?? 'pre-produccion']
  : ['deploy', '--project', PROYECTO, '--only', 'hosting']

console.log(`\n  Destino: ${PROYECTO}${previsualizacion ? ` (channel "${canal ?? 'pre-produccion'}")` : ''}`)
console.log(`  firebase ${args.join(' ')}\n`)

if (dry) {
  console.log('  --dry: no se ejecuta nada.\n')
  process.exit(0)
}

const hijo = spawn('firebase', args, { stdio: 'inherit', shell: true })

hijo.on('error', (e) => {
  console.error(`\n  No se pudo lanzar firebase: ${(e as Error).message}`)
  process.exitCode = 1
})

hijo.on('exit', (code, signal) => {
  if (signal) process.exitCode = 1
  else process.exitCode = code ?? 0
})