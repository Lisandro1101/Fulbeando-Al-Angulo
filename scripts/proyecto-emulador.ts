/**
 * projectId unico de los emuladores.
 *
 * Los emuladores de Firebase particionan por `projectId`: el mismo email en
 * `demo-al-angulo` y en `fulbeando-demo` son DOS usuarios distintos. Ese
 * detalle costo una tarde: el seed escribia en `demo-al-angulo` mientras la app
 * autenticaba contra `fulbeando-demo`, asi que `npm run dev:all` terminaba sin
 * error, `seed:verify` daba todo verde, y al intentar entrar la app respondia
 * `auth/user-not-found` con el seed "correcto".
 *
 * La causa de fondo era que el projectId estaba escrito en tres lugares
 * distintos (`.firebaserc`, `app/.env.local` y el seed). Ahora hay una sola
 * fuente y este modulo falla ruidosamente si se desincroniza, en vez de dejar
 * que el fallo aparezca tres minutos despues, en el login, como un error de
 * credenciales.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const RAIZ = resolve(process.cwd())

const leer = (ruta: string): string => readFileSync(resolve(RAIZ, ruta), 'utf8')

/** Proyecto declarado para la CLI (`firebase emulators:start`). */
export const projectIdDeFirebaserc = (): string | null => {
  const ruta = resolve(RAIZ, '.firebaserc')
  if (!existsSync(ruta)) return null
  try {
    const rc = JSON.parse(leer('.firebaserc')) as { projects?: { default?: string } }
    return rc.projects?.default ?? null
  } catch {
    return null
  }
}

const projectIdDeEnv = (archivo: string): string | null => {
  if (!existsSync(resolve(RAIZ, archivo))) return null
  const linea = leer(archivo)
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith('VITE_FIREBASE_PROJECT_ID='))
  return linea ? linea.split('=')[1]?.trim() || null : null
}

/** Proyecto que usa el bundle del navegador (`app/.env.local`). */
export const projectIdDeLaApp = (): string | null => projectIdDeEnv('app/.env.local')

/**
 * Proyecto real (`app/.env.production`), el contra el que se despliega.
 *
 * Los emuladores usan `fulbeando-demo` y el deploy va a
 * `fulbeando-al-angulo-26`: son dos proyectos distintos a proposito. Dejarlos
 * ambos explicitos evita depender del `activeProjects` global de firebase-tools,
 * que ya rompio el flujo local una vez.
 */
export const projectIdDeProduccion = (): string | null => projectIdDeEnv('app/.env.production')

const RESPUESTA = projectIdDeFirebaserc() ?? projectIdDeLaApp() ?? 'fulbeando-demo'

const deLaCli = projectIdDeFirebaserc()
const deLaApp = projectIdDeLaApp()

if (deLaCli && deLaApp && deLaCli !== deLaApp) {
  throw new Error(
    `\n  projectId desincronizado:\n` +
      `    .firebaserc          -> ${deLaCli}\n` +
      `    app/.env.local       -> ${deLaApp}\n` +
      `  Los emuladores separan los datos por proyecto: el seed escribiria en\n` +
      `  uno y la app leeria del otro, y el login fallaria con\n` +
      `  "auth/user-not-found" aunque todo lo demas pareciese bien.\n`,
  )
}

if (!deLaCli) {
  console.warn(
    ` Aviso: no hay .firebaserc. Usando "${RESPUESTA}" como proyecto por defecto.\n` +
      `  Crear .firebaserc con { "projects": { "default": "${RESPUESTA}" } }.`,
  )
}

export const PROJECT_ID = RESPUESTA