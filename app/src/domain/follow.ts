import type { Auditoria } from './comun'

/**
 * Relacion de seguimiento entre jugadores.
 *
 * El id del documento es determinista: `${followerUid}_${followedUid}`, asi que
 * seguir dos veces es idempotente y "dejar de seguir" es un `delete` directo.
 */
export interface Follow extends Auditoria {
  id: string
  followerUid: string
  followedUid: string
}
