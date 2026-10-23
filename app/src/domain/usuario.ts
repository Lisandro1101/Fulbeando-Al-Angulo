import type { Auditoria, GeoIndex, NivelAutopercibido, PiernaHabil, Posicion } from './comun'

/** Roles del PRD. Un usuario tiene un unico rol activo. */
export type Rol = 'invitado' | 'jugador' | 'dueno_predio' | 'superadmin'

/**
 * Estado del plan del dueno de predio.
 *
 * Elegir "Tengo un Complejo" en el registro no habilita nada por si solo: deja
 * el plan `pendiente` y el dueño ve unicamente el cartel de contacto. El
 * superadmin lo pasa a `activo` al aprobar la solicitud (cobro del plan).
 */
export type EstadoPlanDueno = 'pendiente' | 'activo'

/** Estado de baja logica. No existe el borrado fisico (regla de negocio 6.3). */
export type EstadoUsuario = 'activo' | 'inactivo'

export type PlayerRole = 'GK' | 'DEF' | 'MID' | 'FWD' | 'DT'

export interface PlayerStats {
  goals: number
  assists?: number
  matchesPlayed: number
  mvpCount: number
  fairPlayIndex: number
}

export interface PerfilDeportivo {
  posicion: Posicion | null
  piernaHabil: PiernaHabil | null
  nivel: NivelAutopercibido | null
  /** Switch "Disponible para jugar hoy" (Pantalla de Ajustes). */
  disponibleHoy: boolean
  /** Switch de notificaciones del radar Falta 1. */
  notificacionesRadar: boolean
  
  // --- INTEGRACIÓN AL ÁNGULO ---
  playerRole: PlayerRole | null
  stats: PlayerStats
  rating: number
  club?: string | null
  edad?: number | null
  teamIds: string[] // Reducción de costos N+1
}

export const PERFIL_DEPORTIVO_VACIO: PerfilDeportivo = {
  posicion: null,
  piernaHabil: null,
  nivel: null,
  disponibleHoy: false,
  notificacionesRadar: true,
  playerRole: null,
  stats: { goals: 0, assists: 0, matchesPlayed: 0, mvpCount: 0, fairPlayIndex: 100 },
  rating: 5.0,
  teamIds: [],
}

export interface Usuario extends Auditoria {
  uid: string
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  whatsappVerificado: boolean
  rol: Rol
  /** Solo para rol jugador. */
  perfilDeportivo: PerfilDeportivo | null
  /** Ultima ubicacion aproximada (coordenadas provistas por el usuario). */
  geo: GeoIndex | null
  /** Barrio / zona declarada para la busqueda por zona. */
  zona: string | null
  /**
   * Municipio / Partido declarado. Es el nivel que agrupa el feed "Mi zona":
   * mas amplio que `zona` (barrio/localidad). Opcional porque los documentos
   * creados antes de este campo no lo traen.
   */
  municipio?: string | null
  fotoUrl: string | null
  /**
   * Fecha de nacimiento en `AAAA-MM-DD`, cargada en el registro.
   *
   * Es la UNICA fuente de la edad de la ficha: `edadDe()` la deriva en lectura,
   * asi que cumplir un cumpleaños no cuesta una escritura. Opcional porque los
   * documentos creados antes de este campo no lo tienen.
   */
  fechaNacimiento?: string | null
  /**
   * Plan del dueno. Solo tiene sentido con `rol == 'dueno_predio'`.
   *
   * Opcional (documentos antiguos y jugadores no lo traen): para el dueno sin
   * el campo se asume `pendiente`, que es el estado por defecto de toda alta
   * nueva. `planDuenoActivo()` es la unica puerta de entrada a `/venue-*`.
   */
  planDueno?: EstadoPlanDueno | null
  estado: EstadoUsuario
}

export const nombreCompleto = (u: Pick<Usuario, 'nombre' | 'apellido'>): string =>
  `${u.nombre} ${u.apellido}`.trim()

const RANGO_EDAD = { min: 0, max: 120 }

/**
 * Edad en años cumplidos. Se calcula en cada lectura: cero escrituras y nunca
 * desactualiza, a diferencia de guardar `perfilDeportivo.edad` a mano.
 */
export const edadDe = (u: Usuario): number | null => {
  const iso = u.fechaNacimiento
  if (iso) {
    const [anio, mes, dia] = iso.split('-').map(Number)
    if (anio && mes && dia) {
      const hoy = new Date()
      let edad = hoy.getFullYear() - anio
      const mesActual = hoy.getMonth() + 1
      if (mesActual < mes || (mesActual === mes && hoy.getDate() < dia)) edad -= 1
      if (edad >= RANGO_EDAD.min && edad <= RANGO_EDAD.max) return edad
    }
  }
  // Datos precargados por el seed / por integraciones previas.
  return u.perfilDeportivo?.edad ?? null
}

/** Un usuario alimenta el radar solo si esta activo y con el switch encendido. */
export const esCandidatoParaRadar = (u: Usuario): boolean =>
  u.estado === 'activo' &&
  u.deletedAt === null &&
  u.rol === 'jugador' &&
  u.perfilDeportivo !== null &&
  u.perfilDeportivo.disponibleHoy &&
  u.perfilDeportivo.notificacionesRadar &&
  u.geo !== null

/**
 * El dueno puede operar su panel solo con el plan abonado.
 *
 * Solo se consulta para `rol == 'dueno_predio'`: a un jugador o al superadmin
 * no se les pide plan. El campo puede faltar en documentos viejos, y ahi manda
 * el estado por defecto (`pendiente`), nunca el acceso.
 */
export const planDuenoActivo = (u: Usuario | null): boolean =>
  u !== null && u.rol === 'dueno_predio' && u.planDueno === 'activo'

/** El dueno quedo trabado en el cartel de contacto: no puede operar nada. */
export const planDuenoPendiente = (u: Usuario | null): boolean =>
  u !== null && u.rol === 'dueno_predio' && u.planDueno !== 'activo'

/**
 * Calcula la ruta inicial o destino según el rol y estado de la cuenta del usuario.
 * Evita saltos y redirecciones intermedias innecesarias al autenticar.
 */
/**
 * Correos con privilegios de Superadmin garantizados.
 */
export const EMAILS_SUPERADMIN = new Set([
  'lisandrodileva@gmail.com',
  'superadmin@fulbeando.com',
])

export const esEmailSuperadmin = (email: string | null | undefined): boolean =>
  !!email && EMAILS_SUPERADMIN.has(email.toLowerCase().trim())

export const calcularRutaDestino = (u: Usuario | null | undefined): string => {
  if (!u) return '/login'
  if (u.rol === 'superadmin' || esEmailSuperadmin(u.email)) return '/superadmin'
  if (planDuenoPendiente(u)) return '/plan-pendiente'
  if (u.rol === 'dueno_predio') return '/venue-dashboard'
  if (u.rol === 'invitado') return '/role-selector'
  return '/radar'
}
