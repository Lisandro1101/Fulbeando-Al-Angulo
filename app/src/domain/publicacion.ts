import type { Auditoria } from './comun'

/**
 * Foto congelada de la carta de un jugador al momento de publicarla.
 *
 * Se guarda el SNAPSHOT (no se recalcula en el feed) para que la publicacion
 * quede como testimonio del momento: si el jugador sube de OVR despues, la
 * publicacion vieja sigue mostrando lo que mostro ese dia.
 */
export interface TarjetaSnapshot {
  media: number
  posicion: string | null
  edad: number | null
  goles: number
  asistencias: number
  partidosJugados: number
  mvpCount: number
  pierna: string | null
  equipoNombre: string | null
  /** Escudo del equipo al publicar (opcional: posts viejos no lo traen). */
  shieldUrl?: string | null
}

/** Reacciones variadas estilo red social. */
export type TipoReaccion = 'like' | 'gol' | 'mvp' | 'risa' | 'fuego'

export const REACCIONES: ReadonlyArray<{ tipo: TipoReaccion; emoji: string; etiqueta: string }> = [
  { tipo: 'like', emoji: '👍', etiqueta: 'Me gusta' },
  { tipo: 'gol', emoji: '⚽', etiqueta: 'Golazo' },
  { tipo: 'mvp', emoji: '⭐', etiqueta: 'MVP' },
  { tipo: 'risa', emoji: '😂', etiqueta: 'Jaja' },
  { tipo: 'fuego', emoji: '🔥', etiqueta: 'Fuego' },
]

/** Una foto del post. En el MVP solo hay imagenes (sin video). */
export interface MediaPost {
  url: string
  tipo: 'imagen'
}

export type TipoPublicacion = 'post' | 'carta' | 'logro'

/**
 * Publicacion del muro de la comunidad.
 *
 * `tipo: 'carta'` la genera "Compartir mi carta"; `post` es un post normal con
 * texto y fotos. Los contadores van desnormalizados en el documento (se
 * mantienen con `increment`) para no contar en cada lectura del feed.
 */
export interface Publicacion extends Auditoria {
  id: string
  autorUid: string
  autorNombre: string
  autorApodo: string
  autorFotoUrl: string | null
  /** Zona (barrio/localidad) del autor al publicar (snapshot), para mostrar. */
  autorZona: string | null
  /** Municipio/Partido del autor al publicar: nivel de agrupacion de "Mi zona". */
  autorMunicipio: string | null
  tipo: TipoPublicacion
  texto: string | null
  media: MediaPost[]
  /** Solo cuando `tipo === 'carta'`. */
  tarjeta?: TarjetaSnapshot
  reaccionesCount: number
  reacciones: Partial<Record<TipoReaccion, number>>
  comentariosCount: number
}

/** Datos que manda el cliente al publicar; el resto lo completa el repositorio. */
export interface AltaPublicacion {
  autorUid: string
  autorNombre: string
  autorApodo: string
  autorFotoUrl: string | null
  autorZona: string | null
  autorMunicipio: string | null
  tipo: TipoPublicacion
  texto?: string | null
  media?: MediaPost[]
  tarjeta?: TarjetaSnapshot
}

/** Reaccion de un usuario a una publicacion: `publicaciones/{id}/reacciones/{uid}`. */
export interface Reaccion extends Auditoria {
  uid: string
  tipo: TipoReaccion
}

/** Comentario: `publicaciones/{id}/comentarios/{comentarioId}`. */
export interface Comentario extends Auditoria {
  id: string
  autorUid: string
  autorNombre: string
  autorApodo: string
  autorFotoUrl: string | null
  texto: string
}
