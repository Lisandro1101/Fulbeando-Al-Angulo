import type { Auditoria, GeoIndex, NivelAutopercibido, PiernaHabil, Posicion } from './comun'

/** Roles del PRD. Un usuario tiene un unico rol activo. */
export type Rol = 'invitado' | 'jugador' | 'dueno_predio' | 'superadmin'

/** Estado de baja logica. No existe el borrado fisico (regla de negocio 6.3). */
export type EstadoUsuario = 'activo' | 'inactivo'

export type PlayerRole = 'GK' | 'DEF' | 'MID' | 'FWD' | 'DT'

export interface PlayerStats {
  goals: number
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
  teamIds: string[] // Reducción de costos N+1
}

export const PERFIL_DEPORTIVO_VACIO: PerfilDeportivo = {
  posicion: null,
  piernaHabil: null,
  nivel: null,
  disponibleHoy: false,
  notificacionesRadar: true,
  playerRole: null,
  stats: { goals: 0, matchesPlayed: 0, mvpCount: 0, fairPlayIndex: 100 },
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
  fotoUrl: string | null
  estado: EstadoUsuario
}

export const nombreCompleto = (u: Pick<Usuario, 'nombre' | 'apellido'>): string =>
  `${u.nombre} ${u.apellido}`.trim()

/** Un usuario alimenta el radar solo si esta activo y con el switch encendido. */
export const esCandidatoParaRadar = (u: Usuario): boolean =>
  u.estado === 'activo' &&
  u.deletedAt === null &&
  u.rol === 'jugador' &&
  u.perfilDeportivo !== null &&
  u.perfilDeportivo.disponibleHoy &&
  u.perfilDeportivo.notificacionesRadar &&
  u.geo !== null
