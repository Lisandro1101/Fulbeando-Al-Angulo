import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { COLECCIONES, appEnv } from '@/core/config'
import { db } from '@/core/firebase'
import { haversineKm, prefijosQueCubren, type Punto } from '@/core/geo/geohash'
import {
  MAX_EQUIPOS_POR_JUGADOR,
  MAX_MEMBROS_EQUIPO,
  nombreCompleto,
  type Equipo,
  type GeoIndex,
  type MiembroEquipo,
  type RolEquipo,
  type Usuario,
} from '@/domain'

/**
 * SERVICIO DE EQUIPOS ("AL ANGULO") sobre el usuario de FULBEANDO.
 *
 * Este archivo reemplaza a `teamCreationService.ts` y al antiguo `teamService.ts`
 * (coleccion `users`, `getdb` inexistente, tipos rotos). Ahora hay una sola via
 * de escritura y el puente con el modulo FULBEANDO es explicito:
 *
 *   - El equipo vive en `teams/{id}` con el capitán desnormalizado en `members`.
 *   - La pertenencia se refleja SIEMPRE en `usuarios/{uid}.perfilDeportivo.teamIds`,
 *     que es lo que permite listar "mis equipos" sin consultar toda la coleccion.
 *
 * REGLAS (ver `app/firebase/firestore.rules`):
 *   - Crear exige `captainId == auth.uid` y `members.size()` entre 1 y 22.
 *   - Actualizar exige ser capitan, o bien agregar unicamente el propio uid a
 *     `members` (permiso de autoinscripcion, anadido junto a este servicio).
 *   - Borrar esta prohibido: se da de baja con `miembros` vacio o estado logico.
 */

export interface CrearEquipoInput {
  nombre: string
  escudoUrl?: string | null
  modalidadBase: string
}

export class ErrorEquipo extends Error {
  constructor(public readonly codigo: string, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorEquipo'
  }
}

/** Lee el documento y valida que exista (evita `undefined` aguas abajo). */
const obtenerEquipo = async (equipoId: string): Promise<Equipo> => {
  const snap = await getDoc(doc(db, COLECCIONES.equipos, equipoId))
  if (!snap.exists()) {
    throw new ErrorEquipo('EQUIPO_NO_EXISTE', `El equipo ${equipoId} no existe`)
  }
  return { ...snap.data(), id: snap.id } as Equipo
}

/** Ref del documento de usuario, destino del puente `perfilDeportivo.teamIds`. */
const refUsuario = (uid: string) => doc(db, COLECCIONES.usuarios, uid)

/**
 * Equipos del usuario, leidos de `perfilDeportivo.teamIds`.
 *
 * Tolera el perfil vacio y el `null` de los usuarios que no son jugadores: un
 * dueno de cancha tambien puede crear equipo, y al abrir la app puede no tener
 * `perfilDeportivo` todavia.
 */
const equipoIdsDe = (usuario: Usuario | null | undefined): string[] =>
  usuario?.perfilDeportivo?.teamIds ?? []

// -------------------------------------------------------------------------
// Crear
// -------------------------------------------------------------------------

/**
 * Crea el equipo con el usuario como capitan, en una transaccion para que el
 * equipo y el vinculo del usuario no queden inconsistentes.
 */
export const crearEquipo = async (
  uid: string,
  displayName: string,
  input: CrearEquipoInput,
): Promise<string> => {
  const equipoId = doc(collection(db, COLECCIONES.equipos)).id
  const equipoRef = doc(db, COLECCIONES.equipos, equipoId)
  const usuarioRef = refUsuario(uid)

  await runTransaction(db, async (tx) => {
    const usuarioSnap = await tx.get(usuarioRef)
    if (!usuarioSnap.exists()) {
      throw new ErrorEquipo('USUARIO_NO_EXISTE', 'No se encontro el documento del usuario')
    }

    const capitan: MiembroEquipo = { uid, name: displayName, role: 'CAPITAN' }

    // Regla de negocio: 2 equipos simultaneos como maximo, y el equipo propio
    // cuenta. Se lee DENTRO de la transaccion para no competir con otra
    // incorporacion concurrente.
    const equiposActuales = equipoIdsDe(usuarioSnap.data() as Usuario)
    if (equiposActuales.length >= MAX_EQUIPOS_POR_JUGADOR) {
      throw new ErrorEquipo(
        'LIMITE_EQUIPOS',
        `Ya perteneces a ${equiposActuales.length} equipos. El maximo es ${MAX_EQUIPOS_POR_JUGADOR}.`,
      )
    }

    tx.set(equipoRef, {
      id: equipoId,
      name: input.nombre,
      shieldUrl: input.escudoUrl ?? null,
      modalidadBase: input.modalidadBase,
      captainId: uid,
      members: [capitan],
      stats: { wins: 0, draws: 0, losses: 0 },
      createdAt: serverTimestamp(),
    })

    // El puente con FULBEANDO: el usuario guarda el equipo en su perfil.
    tx.set(
      usuarioRef,
      { perfilDeportivo: { teamIds: arrayUnion(equipoId) } },
      { merge: true },
    )
  })

  return equipoId
}

// -------------------------------------------------------------------------
// Membresia
// -------------------------------------------------------------------------

/**
 * Union: el jugador se agrega a si mismo.
 *
 * La pertenencia es SIEMPRE auto-servicio. La regla de
 * `usuarios/{uid}` solo permite escribir el propio documento, asi que un capitan
 * no podria vincular a otro jugador (le darian permiso de reescribir el
 * `perfilDeportivo` de terceros). En vez de abrir ese permiso, el flujo es:
 * el capitan comparte el link / manda la invitacion, y el jugador se une.
 *
 * Dorsal y posicion quedan en null hasta que el capitan los cargue con
 * `editarMiembro`.
 */
export const unirseAEquipo = async (
  equipoId: string,
  uid: string,
): Promise<void> => {
  const equipo = await obtenerEquipo(equipoId)
  if (equipo.members.some((m) => m.uid === uid)) {
    throw new ErrorEquipo('YA_ES_MIEMBRO', 'Ya sos parte de este equipo')
  }
  if (equipo.members.length >= MAX_MEMBROS_EQUIPO) {
    throw new ErrorEquipo('PLANTEL_LLENO', 'El equipo esta completo')
  }

  // El nombre sale del propio documento, no del parametro: la regla
  // `soloAnadePropioMiembro` exige que coincida con el nombre del usuario, asi
  // que un cliente manipulado no podria colar un nombre arbitrario en el plantel.
  const usuarioRef = refUsuario(uid)
  const usuarioSnap = await getDoc(usuarioRef)
  if (!usuarioSnap.exists()) {
    throw new ErrorEquipo('USUARIO_NO_EXISTE', 'No se encontro el documento del usuario')
  }
  const nombre = nombreCompleto(usuarioSnap.data() as Usuario)

  const equipoRef = doc(db, COLECCIONES.equipos, equipoId)
  await runTransaction(db, async (tx) => {
    // El limite de 2 equipos se revalida dentro de la transaccion contra el
    // estado actual, no contra el `getDoc` de antes: entre esa lectura y esta
    // transaccion el jugador could've entrado a otro equipo.
    const usuarioTx = await tx.get(usuarioRef)
    if (!usuarioTx.exists()) {
      throw new ErrorEquipo('USUARIO_NO_EXISTE', 'No se encontro el documento del usuario')
    }
    const equiposActuales = equipoIdsDe(usuarioTx.data() as Usuario)
    if (!equiposActuales.includes(equipoId) && equiposActuales.length >= MAX_EQUIPOS_POR_JUGADOR) {
      throw new ErrorEquipo(
        'LIMITE_EQUIPOS',
        `Ya perteneces a ${equiposActuales.length} equipos. El maximo es ${MAX_EQUIPOS_POR_JUGADOR}.`,
      )
    }

    tx.update(equipoRef, {
      members: arrayUnion({ uid, name: nombre, role: 'PLAYER' }),
    })
    tx.set(
      usuarioRef,
      { perfilDeportivo: { teamIds: arrayUnion(equipoId) } },
      { merge: true },
    )
  })
}

/** Sale del equipo o es liberado. El capitan no puede salirse sin delegar antes. */
export const salirDelEquipo = async (equipoId: string, uid: string): Promise<void> => {
  const equipo = await obtenerEquipo(equipoId)
  if (equipo.captainId === uid) {
    throw new ErrorEquipo(
      'ES_CAPITAN',
      'Delegá la capitania antes de salir del equipo',
    )
  }
  const miembro = equipo.members.find((m) => m.uid === uid)
  if (!miembro) {
    throw new ErrorEquipo('NO_ES_MIEMBRO', 'No sos miembro de este equipo')
  }

  const equipoRef = doc(db, COLECCIONES.equipos, equipoId)
  await runTransaction(db, async (tx) => {
    tx.update(equipoRef, { members: arrayRemove(miembro) })
    tx.set(
      doc(db, COLECCIONES.usuarios, uid),
      { perfilDeportivo: { teamIds: arrayRemove(equipoId) } },
      { merge: true },
    )
  })
}

/** Cede la capitania. El equipo y el perfil quedan consistentes. */
export const delegarCapitania = async (
  equipoId: string,
  capitanActualUid: string,
  nuevoCapitanUid: string,
): Promise<void> => {
  const equipo = await obtenerEquipo(equipoId)
  if (equipo.captainId !== capitanActualUid) {
    throw new ErrorEquipo('SIN_PERMISO', 'Solo el capitan actual puede delegar')
  }
  const objetivo = equipo.members.find((m) => m.uid === nuevoCapitanUid)
  if (!objetivo) {
    throw new ErrorEquipo('NO_ES_MIEMBRO', 'El nuevo capitan no pertenece al equipo')
  }

  const members = equipo.members.map((m) => {
    if (m.uid === nuevoCapitanUid) return { ...m, role: 'CAPITAN' as RolEquipo }
    if (m.uid === capitanActualUid) return { ...m, role: 'PLAYER' as RolEquipo }
    return m
  })

  await updateDoc(doc(db, COLECCIONES.equipos, equipoId), {
    captainId: nuevoCapitanUid,
    members,
  })
}

/** El capitan edita datos del jugador: dorsal, posicion, rol. */
export const editarMiembro = async (
  equipoId: string,
  capitanUid: string,
  uidMiembro: string,
  cambios: Partial<Pick<MiembroEquipo, 'dorsal' | 'position' | 'role' | 'avatarUrl'>>,
): Promise<void> => {
  const equipo = await obtenerEquipo(equipoId)
  if (equipo.captainId !== capitanUid) {
    throw new ErrorEquipo('SIN_PERMISO', 'Solo el capitan puede editar el plantel')
  }
  const members = equipo.members.map((m) =>
    m.uid === uidMiembro ? { ...m, ...cambios } : m,
  )
  await updateDoc(doc(db, COLECCIONES.equipos, equipoId), { members })
}

// -------------------------------------------------------------------------
// Lecturas
// -------------------------------------------------------------------------

/**
 * "Mis equipos": sale de `perfilDeportivo.teamIds`, asi que son 2 lecturas
 * (usuario + N documentos de equipo) en vez de una consulta a toda la coleccion.
 */
export const obtenerEquiposDeUsuario = async (uid: string): Promise<Equipo[]> => {
  const usuarioSnap = await getDoc(doc(db, COLECCIONES.usuarios, uid))
  if (!usuarioSnap.exists()) return []

  const ids: string[] = usuarioSnap.data()?.perfilDeportivo?.teamIds ?? [];
  if (ids.length === 0) return []

  const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, COLECCIONES.equipos, id))))
  return snaps
    .filter((s) => s.exists())
    .map((s) => ({ ...s.data(), id: s.id }) as Equipo)
}

/**
 * Busca jugadores por nombre o apellido. Reemplaza el array `mockUsuarios` que
 * tenia la pantalla de "Mi Equipo": la invitacion sale de datos reales.
 *
 * NOTA: el rango de Firestore ordena por code point, asi que el prefijo se
 * filtra en el servidor pero la comparacion sin mayusculas se hace aca. Con el
 * rango acotado (<= 20 docs) el costo es despreciable y asi no hace falta un
 * campo `nombreLower` desnormalizado ni un indice compuesto.
 */
export const buscarJugadores = async (
  termino: string,
  limite = 10,
): Promise<MiembroEquipo[]> => {
  const prefijo = termino.trim()
  if (prefijo.length < 2) return []

  const snap = await getDocs(
    query(
      collection(db, COLECCIONES.usuarios),
      where('nombre', '>=', prefijo),
      where('nombre', '<=', `${prefijo}\uf8ff`),
      where('estado', '==', 'activo'),
      limit(limite * 3),
    ),
  )

  const q = prefijo.toLowerCase()
  return snap.docs
    .filter((d) => {
      const data = d.data()
      return (
        data.deletedAt === null &&
        `${data.nombre ?? ''} ${data.apellido ?? ''}`.toLowerCase().includes(q)
      )
    })
    .slice(0, limite)
    .map((d) => {
      const data = d.data()
      return {
        uid: d.id,
        name: `${data.nombre ?? ''} ${data.apellido ?? ''}`.trim() || 'Jugador',
        role: 'PLAYER' as RolEquipo,
        avatarUrl: data.fotoUrl ?? null,
      }
    })
}

// -------------------------------------------------------------------------
// Resultados
// -------------------------------------------------------------------------

/**
 * Suma un resultado al historial del equipo.
 *
 * `increment` es atomico: leer `stats` y escribir `stats + 1` en dos viajes
 * perderia incrementos si dos partidos terminan a la vez.
 *
 * No lo debería llamar el cliente (podia declararse siempre ganador): lo
 * invoca el backend al cerrar un `partido`.
 */
export const registrarResultado = async (
  equipoId: string,
  resultado: 'wins' | 'draws' | 'losses',
): Promise<void> => {
  await updateDoc(doc(db, COLECCIONES.equipos, equipoId), {
    [`stats.${resultado}`]: increment(1),
  })
}

// -------------------------------------------------------------------------
// Radar de equipos
// -------------------------------------------------------------------------

/**
 * Equipos que juegan en el area, ordenados por distancia.
 *
 * Usa el mismo motor geoespacial que los desafios y el radar de agentes
 * (`prefijosQueCubren` + `haversineKm`), asi que las tres capas del mapa
 * comparten criterio de "cerca". Lo consume el dueño de cancha, que necesita ver
 * los equipos de su zona para ofrecerles cancha.
 *
 * Los equipos sin `geo` quedan fuera del mapa, pero no se rompen: se siguen
 * listando desde `obtenerEquiposDeUsuario`.
 */
export const listarEquiposCercanos = async (
  punto: Punto,
  radioKm: number = appEnv().radarRadioKm,
): Promise<Array<Equipo & { distanciaKm: number }>> => {
  const prefijos = prefijosQueCubren(punto, radioKm, 5)
  if (prefijos.length === 0) return []

  const snap = await getDocs(
    query(
      collection(db, COLECCIONES.equipos),
      where('geo.prefijos', 'array-contains-any', prefijos),
      limit(30),
    ),
  )

  return snap.docs
    .map((d) => ({ ...(d.data() as Equipo), id: d.id }))
    .filter((e) => e.geo !== null && e.geo !== undefined)
    .map((e) => ({ ...e, distanciaKm: haversineKm(punto, e.geo as GeoIndex) }))
    .filter((e) => e.distanciaKm <= radioKm)
    .sort((a, b) => a.distanciaKm - b.distanciaKm)
}