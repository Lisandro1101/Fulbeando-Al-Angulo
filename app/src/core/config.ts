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

export interface AppEnv {
  firebase: FirebaseEnv
  /** Conecta al emulador local de Firebase. */
  useEmulators: boolean
  /** Radio por defecto del radar "Falta 1". */
  radarRadioKm: number
}

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
} as const
