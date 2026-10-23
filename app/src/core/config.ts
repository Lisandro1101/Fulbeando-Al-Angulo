/**
 * Variables de entorno tipadas. Se leen de import.meta.env para que Vite las
 * inyecte en build, y de process.env para el seed script (Node).
 */
export interface FirebaseEnv {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

/**
 * Senia por defecto para predios que aun no cargaron sus datos bancarios.
 * `DatosDeCobro.montoSena` es obligatorio, asi que el alta de predio usa este
 * valor como placeholder hasta que el dueno lo configure.
 */
export const MONTO_SENA_DEFAULT = 4000

/**
 * Contacto comercial del dueno de predio (PLACEHOLDER).
 *
 * El alta de dueño no se habilita sola: queda `pendiente` y el dueno ve este
 * cartel hasta que el superadmin activa el plan. Cambiar el numero aca cambia
 * el cartel y el link de WhatsApp, en un solo lugar.
 */
export const CONTACTO_PLAN_DUENO = {
  /** Lo que se muestra en pantalla. */
  visible: '+54 9 11 0000-0000',
  /** Solo digitos, para armar `wa.me/<numero>`. */
  whatsapp: '5491100000000',
} as const

export interface AppEnv {
  firebase: FirebaseEnv
  /** Conecta al emulador local de Firebase. */
  useEmulators: boolean
  /** Radio por defecto del radar "Falta 1". */
  radarRadioKm: number
  /**
   * Radar servido por la Cloud Function `radarQuery` (Fase 2) en vez de las
   * cuatro consultas directas. Default `false`: apagado deja el comportamiento
   * actual intacto. Si la Function falla, el cliente cae solo a las consultas
   * directas (ver `MapaRadarUnificado`).
   */
  radarUsaFunction: boolean
}

/** Region de despliegue de `radarQuery`. Debe coincidir con la Function. */
export const RADAR_FUNCTIONS_REGION = 'southamerica-east1'

const read = (key: string, fallback = ''): string => {
  const viteValue = (import.meta as { env?: Record<string, string | undefined> }).env?.[key]
  if (typeof viteValue === 'string' && viteValue.length > 0) return viteValue
  const nodeValue = typeof process !== 'undefined' ? process.env?.[key] : undefined
  return nodeValue && nodeValue.length > 0 ? nodeValue : fallback
}

const flag = (key: string, fallback = false): boolean => {
  const raw = read(key, fallback ? 'true' : 'false').toLowerCase()
  return raw === 'true' || raw === '1'
}

export const firebaseEnv = (): FirebaseEnv => ({
  apiKey: read('VITE_FIREBASE_API_KEY'),
  authDomain: read('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: read('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: read('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: read('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: read('VITE_FIREBASE_APP_ID'),
})

export const appEnv = (): AppEnv => ({
  firebase: firebaseEnv(),
  useEmulators: flag('VITE_USE_EMULATORS', false),
  radarRadioKm: Number(read('VITE_RADAR_RADIO_KM', '5')),
  radarUsaFunction: flag('VITE_RADAR_USA_FUNCTION', false),
})

export const faltaConfigFirebase = (): string[] => {
  const env = firebaseEnv()
  return Object.entries(env)
    .filter(([, value]) => value.length === 0)
    .map(([key]) => key)
}

/** Nombres de coleccion. Unico punto de verdad compartido por repos. */
export const COLECCIONES = {
  usuarios: 'usuarios',
  predios: 'predios',
  canchas: 'canchas',
  turnos: 'turnos',
  alertas: 'alertas',
  postulaciones: 'postulaciones',
  comprobantes: 'comprobantes',
  reportes: 'reportes',
  notificaciones: 'notificaciones',
  solicitudes: 'solicitudes',

  // Colecciones del modulo "AL ANGULO". La clave es en español (consistencia con
  // el resto) pero el valor conserva el nombre legacy en ingles: renombrarlas
  // dejaria huerfano el contenido del proyecto real `fulbeando-al-angulo-26`
  // y obligaria a migrar `firestore.rules`. No cambiar sin una migracion.
  equipos: 'teams',
  desafios: 'challenges',
  partidos: 'matches',
  resenas: 'reviews',
  invitaciones: 'invitaciones',
  /** Una ficha por jugador y por partido: goles, asistencias y MVP. */
  estadisticasPartido: 'estadisticas_partido',
  /** Muro de la comunidad: posts y cartas de jugador publicadas. */
  publicaciones: 'publicaciones',
  /** Grafo social: `follows/{followerUid}_{followedUid}`. */
  follows: 'follows',
  /** Publicidad nativa y sponsors locales. */
  publicidades: 'publicidades',
} as const

/**
 * Subcolecciones dentro de una publicacion. Se declaran aparte para que los
 * repos y las reglas no dependan de strings sueltos.
 */
export const SUBCOLECCIONES = {
  reacciones: 'reacciones',
  comentarios: 'comentarios',
} as const
