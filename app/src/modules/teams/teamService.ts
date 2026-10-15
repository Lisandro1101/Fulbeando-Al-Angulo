import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
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
  genero?: 'Masculino' | 'Femenino' | 'Mixto'
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
      genero: input.genero || 'Masculino',
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
  const uData = usuarioSnap.data() as Usuario
  const nombre = nombreCompleto(uData) || (uData as any).displayName || 'Jugador'

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

/**
 * El capitan saca a un integrante del plantel.
 *
 * Escribe DOS documentos en la MISMA transaccion:
 *   1. `teams/{id}.members`                         → se va el miembro;
 *   2. `usuarios/{uid}.perfilDeportivo.teamIds`     → se desvincula el equipo.
 *
 * La segunda escritura es la que habilita `capitanDesvinculaSuEquipo()` en
 * `firestore.rules`. Sin ella, el jugador liberado se quedaria con un id
 * huerfano en `teamIds` y gastaria una de sus 2 fichas de equipo sin tener
 * equipo visible. Sale con `arrayRemove` sobre el miembro leido del documento,
 * asi que tambien funciona si el plantel tiene `dorsal` o `position` cargados.
 */
export const liberarMiembro = async (
  equipoId: string,
  capitanUid: string,
  uidMiembro: string,
): Promise<void> => {
  if (capitanUid === uidMiembro) {
    throw new ErrorEquipo(
      'NO_LIBERA_A_SI_MISMO',
      'Delega la capitania antes de salir del equipo',
    )
  }

  const equipoRef = doc(db, COLECCIONES.equipos, equipoId)
  const miembroRef = refUsuario(uidMiembro)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(equipoRef)
    if (!snap.exists()) {
      throw new ErrorEquipo('EQUIPO_NO_EXISTE', `El equipo ${equipoId} no existe`)
    }
    const equipo = { ...snap.data(), id: snap.id } as Equipo
    if (equipo.captainId !== capitanUid) {
      throw new ErrorEquipo('SIN_PERMISO', 'Solo el capitan puede liberar jugadores')
    }
    const miembro = equipo.members.find((m) => m.uid === uidMiembro)
    if (!miembro) {
      throw new ErrorEquipo('NO_ES_MIEMBRO', 'Ese jugador no esta en el plantel')
    }

    tx.update(equipoRef, { members: arrayRemove(miembro) })
    tx.set(miembroRef, { perfilDeportivo: { teamIds: arrayRemove(equipoId) } }, { merge: true })
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
 * Escucha en TIEMPO REAL los equipos a los que pertenece el usuario.
 * Cualquier cambio en el equipo (convocatoria, nuevos miembros, confirmados al partido,
 * bajas, cambio de escudo o capitán) se propaga instantáneamente a todos los jugadores.
 */
export const escucharEquiposDeUsuario = (
  uid: string,
  callback: (equipos: Equipo[]) => void,
): (() => void) => {
  let unsubscribeEquipos: Array<() => void> = []
  let unsubscribeRefuerzos: (() => void) | null = null

  const equiposMap = new Map<string, Equipo>()
  let currentTeamIds: string[] = []
  let refuerzosTeams: Equipo[] = []

  const emitir = () => {
    const todosMap = new Map<string, Equipo>()
    // 1. Equipos regulares del usuario
    currentTeamIds.forEach((id) => {
      const eq = equiposMap.get(id)
      if (eq) todosMap.set(id, eq)
    })
    // 2. Equipos donde es refuerzo temporal para el partido de hoy
    refuerzosTeams.forEach((eq) => {
      if (!todosMap.has(eq.id)) {
        todosMap.set(eq.id, eq)
      }
    })
    callback(Array.from(todosMap.values()))
  }

  // Escuchar equipos donde el usuario figura como confirmado en la convocatoria activa
  try {
    const qRefuerzo = query(
      collection(db, COLECCIONES.equipos),
      where('convocatoria.confirmados', 'array-contains', uid),
    )
    unsubscribeRefuerzos = onSnapshot(
      qRefuerzo,
      (snap) => {
        refuerzosTeams = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Equipo))
        emitir()
      },
      (err) => {
        console.warn('Error escuchando equipos como refuerzo:', err)
      },
    )
  } catch (err) {
    console.warn('Error iniciando query de refuerzos:', err)
  }

  const unsubscribeUsuario = onSnapshot(
    doc(db, COLECCIONES.usuarios, uid),
    (userSnap) => {
      // Limpiar listeners anteriores de equipos
      unsubscribeEquipos.forEach((unsub) => unsub())
      unsubscribeEquipos = []

      if (!userSnap.exists()) {
        currentTeamIds = []
        emitir()
        return
      }

      currentTeamIds = userSnap.data()?.perfilDeportivo?.teamIds ?? []
      if (currentTeamIds.length === 0) {
        emitir()
        return
      }

      currentTeamIds.forEach((tId) => {
        const unsub = onSnapshot(
          doc(db, COLECCIONES.equipos, tId),
          (teamDoc) => {
            if (teamDoc.exists()) {
              equiposMap.set(tId, { ...teamDoc.data(), id: teamDoc.id } as Equipo)
            } else {
              equiposMap.delete(tId)
            }
            emitir()
          },
          (err) => {
            console.warn(`Error escuchando equipo ${tId} en tiempo real:`, err)
          },
        )
        unsubscribeEquipos.push(unsub)
      })
    },
    (err) => {
      console.warn('Error escuchando perfil del usuario para equipos:', err)
    },
  )

  return () => {
    unsubscribeUsuario()
    if (unsubscribeRefuerzos) unsubscribeRefuerzos()
    unsubscribeEquipos.forEach((unsub) => unsub())
  }
}

/**
 * Un equipo puntual, para el banner de invitacion `?unirse=<id>`.
 *
 * Devuelve `null` en vez de tirar: un link viejo no tiene por que romper la
 * pantalla. Se lee SOLO cuando se abre una invitacion, asi que el costo es
 * una lectura y solo en ese caso.
 */
export const obtenerEquipoPorId = async (equipoId: string): Promise<Equipo | null> => {
  const snap = await getDoc(doc(db, COLECCIONES.equipos, equipoId))
  if (!snap.exists()) return null
  return { ...snap.data(), id: snap.id } as Equipo
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
  excluirUid?: string,
): Promise<Array<MiembroEquipo & { username: string }>> => {
  const prefijo = termino.trim()
  if (prefijo.length < 1) return []

  const q = prefijo.toLowerCase()
  const qCap = prefijo.charAt(0).toUpperCase() + prefijo.slice(1).toLowerCase()
  const qUpper = prefijo.toUpperCase()

  const colRef = collection(db, COLECCIONES.usuarios)

  // Ejecutamos consultas para cubrir variaciones de capitalización en nombre y apellido,
  // y traemos un conjunto de jugadores registrados para búsqueda en memoria.
  const promesas = [
    getDocs(query(colRef, where('nombre', '>=', qCap), where('nombre', '<=', `${qCap}\uf8ff`), limit(limite * 2))),
    getDocs(query(colRef, where('nombre', '>=', q), where('nombre', '<=', `${q}\uf8ff`), limit(limite * 2))),
    getDocs(query(colRef, where('nombre', '>=', qUpper), where('nombre', '<=', `${qUpper}\uf8ff`), limit(limite * 2))),
    getDocs(query(colRef, where('apellido', '>=', qCap), where('apellido', '<=', `${qCap}\uf8ff`), limit(limite * 2))),
    getDocs(query(colRef, where('apellido', '>=', q), where('apellido', '<=', `${q}\uf8ff`), limit(limite * 2))),
    getDocs(query(colRef, where('rol', '==', 'jugador'), limit(150))),
  ]

  const resultados = await Promise.allSettled(promesas)
  const docsMap = new Map<string, any>()

  for (const res of resultados) {
    if (res.status === 'fulfilled') {
      for (const d of res.value.docs) {
        if (!docsMap.has(d.id)) {
          docsMap.set(d.id, d)
        }
      }
    }
  }

  return Array.from(docsMap.values())
    .filter((d) => {
      // El mismo usuario que busca no puede aparecer en el listado
      if (excluirUid && d.id === excluirUid) return false

      const data = d.data()
      if (data.deletedAt !== null && data.deletedAt !== undefined) return false

      // REGLA ESTRICTA: Solo usuarios con rol de jugador pueden aparecer en la búsqueda
      if (data.rol !== 'jugador') return false

      const nombreCompleto = `${data.nombre ?? ''} ${data.apellido ?? ''}`.trim().toLowerCase()
      const displayName = `${data.displayName ?? ''}`.trim().toLowerCase()
      const email = `${data.email ?? ''}`.toLowerCase()

      return (
        nombreCompleto.includes(q) ||
        displayName.includes(q) ||
        email.includes(q)
      )
    })
    .slice(0, limite)
    .map((d) => {
      const data = d.data()
      const nombre =
        `${data.nombre ?? ''} ${data.apellido ?? ''}`.trim() ||
        data.displayName ||
        'Jugador'
      return {
        uid: d.id,
        name: nombre,
        // El `@` de la app es el prefijo del email: sale del MISMO documento,
        // no de una consulta extra.
        username: `${data.email ?? ''}`.split('@')[0] || d.id,
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
  const esRadioGrande = radioKm > 50
  const prefijos = esRadioGrande ? [] : prefijosQueCubren(punto, radioKm, 5)
  if (!esRadioGrande && prefijos.length === 0) return []

  const q = esRadioGrande
    ? query(
        collection(db, COLECCIONES.equipos),
        limit(50)
      )
    : query(
        collection(db, COLECCIONES.equipos),
        where('geo.prefijos', 'array-contains-any', prefijos),
        limit(30)
      )

  const snap = await getDocs(q)

  return snap.docs
    .map((d) => ({ ...(d.data() as Equipo), id: d.id }))
    .filter((e) => e.geo !== null && e.geo !== undefined)
    .map((e) => ({ ...e, distanciaKm: haversineKm(punto, e.geo as GeoIndex) }))
    .filter((e) => e.distanciaKm <= radioKm)
    .sort((a, b) => a.distanciaKm - b.distanciaKm)
}

/**
 * Actualiza los datos basicos de un equipo.
 * Solo puede ser ejecutado por el capitan.
 */
export const actualizarEquipo = async (
  equipoId: string,
  uid: string,
  cambios: { nombre?: string; modalidadBase?: string; genero?: 'Masculino' | 'Femenino' | 'Mixto'; shieldUrl?: string | null }
): Promise<void> => {
  const eqRef = doc(db, COLECCIONES.equipos, equipoId)
  const snap = await getDoc(eqRef)
  if (!snap.exists()) throw new Error('Equipo no encontrado')
  
  const eqData = snap.data()
  if (eqData.captainId !== uid) throw new Error('Solo el capitan puede editar el equipo')
  
  await updateDoc(eqRef, {
    ...(cambios.nombre ? { name: cambios.nombre } : {}),
    ...(cambios.modalidadBase ? { modalidadBase: cambios.modalidadBase } : {}),
    ...(cambios.genero ? { genero: cambios.genero } : {}),
    ...(cambios.shieldUrl !== undefined ? { shieldUrl: cambios.shieldUrl } : {})
  })
}

// -------------------------------------------------------------------------
// Invitaciones a Equipos con Alerta Push
// -------------------------------------------------------------------------

export type TipoInvitacion = 'invitacion_equipo' | 'desafio_aceptado' | 'postulacion_partido'

export interface InvitacionEquipo {
  id: string
  tipo?: TipoInvitacion
  equipoId: string
  equipoNombre: string
  equipoEscudoUrl: string | null
  remitenteUid: string
  remitenteNombre?: string
  capitanNombre: string
  destinatarioUid: string
  destinatarioNombre: string
  estado: 'pendiente' | 'aceptada' | 'rechazada'
  creadaEn: any
  leida: boolean
  mensaje?: string
  desafioId?: string
  alertaId?: string
  posicion?: string | null
}

/**
 * El capitán envía una invitación formal a un jugador específico.
 * Se guarda en `invitaciones` para disparar el alerta push en tiempo real.
 */
export const enviarInvitacionAEquipo = async (
  remitenteUid: string,
  remitenteNombre: string,
  destinatarioUid: string,
  destinatarioNombre: string,
  equipo: { id: string; name: string; shieldUrl?: string | null },
): Promise<string> => {
  const invRef = doc(collection(db, COLECCIONES.invitaciones))
  const invData: InvitacionEquipo = {
    id: invRef.id,
    tipo: 'invitacion_equipo',
    equipoId: equipo.id,
    equipoNombre: equipo.name,
    equipoEscudoUrl: equipo.shieldUrl ?? null,
    remitenteUid,
    remitenteNombre,
    capitanNombre: remitenteNombre,
    destinatarioUid,
    destinatarioNombre,
    estado: 'pendiente',
    creadaEn: serverTimestamp(),
    leida: false,
  }
  await setDoc(invRef, invData)
  return invRef.id
}

/**
 * Un jugador acepta un desafío de partido en el radar/home.
 * Notifica al creador del desafío en tiempo real con push y modal interactivo.
 */
export const notificarAceptacionDesafio = async (
  remitenteUid: string,
  remitenteNombre: string,
  destinatarioUid: string,
  desafio: {
    id: string
    equipoId?: string
    equipoNombre: string
    descripcion?: string | null
    turnoId?: string | null
  },
  mensajePersonalizado?: string,
): Promise<string> => {
  const invRef = doc(collection(db, COLECCIONES.invitaciones))
  const invData: InvitacionEquipo = {
    id: invRef.id,
    tipo: 'desafio_aceptado',
    equipoId: desafio.equipoId || desafio.id,
    equipoNombre: desafio.equipoNombre,
    equipoEscudoUrl: null,
    remitenteUid,
    remitenteNombre,
    capitanNombre: remitenteNombre,
    destinatarioUid,
    destinatarioNombre: '',
    desafioId: desafio.id,
    mensaje:
      mensajePersonalizado ||
      `${remitenteNombre} aceptó el desafío para jugar con ${desafio.equipoNombre}.`,
    estado: 'pendiente',
    creadaEn: serverTimestamp(),
    leida: false,
  }
  await setDoc(invRef, invData)
  return invRef.id
}

/**
 * Un jugador se postula para sumarse a un partido ese día (Alerta 'Falta 1').
 * Notifica al organizador del partido en tiempo real.
 */
export const notificarPostulacionAlerta = async (
  remitenteUid: string,
  remitenteNombre: string,
  destinatarioUid: string,
  alerta: {
    id: string
    fecha: string
    horaInicio: string
    horaFin: string
    posicion?: string | null
  },
): Promise<string> => {
  const invRef = doc(collection(db, COLECCIONES.invitaciones))
  const invData: InvitacionEquipo = {
    id: invRef.id,
    tipo: 'postulacion_partido',
    equipoId: alerta.id,
    equipoNombre: `Partido ${alerta.fecha}`,
    equipoEscudoUrl: null,
    remitenteUid,
    remitenteNombre,
    capitanNombre: remitenteNombre,
    destinatarioUid,
    destinatarioNombre: '',
    alertaId: alerta.id,
    posicion: alerta.posicion ?? null,
    mensaje: `${remitenteNombre} quiere sumarse al partido del ${alerta.fecha} (${alerta.horaInicio} a ${alerta.horaFin})${
      alerta.posicion ? ` como ${alerta.posicion}` : ''
    }.`,
    estado: 'pendiente',
    creadaEn: serverTimestamp(),
    leida: false,
  }
  await setDoc(invRef, invData)
  return invRef.id
}

/**
 * Responde a una invitación pendiente ('aceptada' o 'rechazada').
 */
export const responderInvitacion = async (
  invitacionId: string,
  estado: 'aceptada' | 'rechazada',
): Promise<void> => {
  const invRef = doc(db, COLECCIONES.invitaciones, invitacionId)
  await updateDoc(invRef, {
    estado,
    updatedAt: serverTimestamp(),
    leida: true,
  })
}

/**
 * Escucha en tiempo real las invitaciones pendientes dirigidas a un usuario.
 */
export const escucharInvitacionesPendientes = (
  destinatarioUid: string,
  alRecibir: (invitaciones: InvitacionEquipo[]) => void,
) => {
  const q = query(
    collection(db, COLECCIONES.invitaciones),
    where('destinatarioUid', '==', destinatarioUid),
    where('estado', '==', 'pendiente'),
  )
  return onSnapshot(
    q,
    (snap) => {
      const list: InvitacionEquipo[] = snap.docs.map((d) => d.data() as InvitacionEquipo)
      alRecibir(list)
    },
    (err) => {
      console.warn('Error escuchando invitaciones pendientes:', err)
    },
  )
}

/**
 * Actualiza la convocatoria de un equipo en Firestore para que todo el plantel
 * vea el partido programado y pueda confirmar o bajarse.
 */
export const actualizarConvocatoriaEquipo = async (
  teamId: string,
  convocatoria: {
    fecha: string
    confirmados: string[]
    bajas: string[]
    predioNombre?: string
    turnoId?: string
    [key: string]: any
  } | null,
): Promise<void> => {
  const eqRef = doc(db, COLECCIONES.equipos, teamId)
  await updateDoc(eqRef, {
    convocatoria,
  })
}

/**
 * Incorpora a un jugador externo como refuerzo temporal del equipo para el partido.
 * Lo agrega a los miembros del equipo (con flag esTemporal) y a la convocatoria confirmada.
 */
export const incorporarRefuerzoAEquipo = async (
  equipoId: string,
  jugador: {
    uid: string
    nombre: string
    avatarUrl?: string | null
    posicion?: string | null
  },
): Promise<void> => {
  const eqRef = doc(db, COLECCIONES.equipos, equipoId)
  const snap = await getDoc(eqRef)
  if (!snap.exists()) return

  const equipoData = snap.data()

  // Actualizar convocatoria: el refuerzo se suma únicamente a los confirmados y refuerzos del partido
  const conv = equipoData.convocatoria || {}
  const confirmadosActuales: string[] = Array.isArray(conv.confirmados) ? conv.confirmados : []
  const nuevosConfirmados = confirmadosActuales.includes(jugador.uid)
    ? confirmadosActuales
    : [...confirmadosActuales, jugador.uid]

  const bajasActuales: string[] = Array.isArray(conv.bajas) ? conv.bajas : []
  const nuevasBajas = bajasActuales.filter((id) => id !== jugador.uid)

  const refuerzosActuales = Array.isArray(conv.refuerzos) ? conv.refuerzos : []
  const nuevosRefuerzos = refuerzosActuales.some((r: any) => r.uid === jugador.uid)
    ? refuerzosActuales
    : [
        ...refuerzosActuales,
        {
          uid: jugador.uid,
          nombre: jugador.nombre,
          avatarUrl: jugador.avatarUrl ?? null,
          posicion: jugador.posicion ?? null,
          esTemporal: true,
        },
      ]

  const faltantes = Math.max(0, (conv.jugadoresFaltantes || 1) - 1)
  const alertaRadarEnviada = faltantes > 0

  await updateDoc(eqRef, {
    convocatoria: {
      ...conv,
      confirmados: nuevosConfirmados,
      bajas: nuevasBajas,
      refuerzos: nuevosRefuerzos,
      jugadoresFaltantes: faltantes,
      alertaRadarEnviada,
    },
  })
}

/**
 * Finaliza el 3er tiempo y cierra el partido:
 * Guarda estadísticas (MVP, goles, asistencias) y desvincula los refuerzos temporales
 * de la convocatoria activa.
 */
export const finalizarTercerTiempoYPartido = async (
  equipoId: string,
  partidoData: {
    mvpId: string | null
    stats: Record<string, { goles: number; asistencias: number }>
  },
): Promise<void> => {
  const eqRef = doc(db, COLECCIONES.equipos, equipoId)
  const snap = await getDoc(eqRef)
  if (!snap.exists()) return

  const equipoData = snap.data()
  const members = Array.isArray(equipoData.members) ? equipoData.members : []
  const conv = equipoData.convocatoria

  // Remover refuerzos temporales del plantel
  const miembrosPermanentes = members.filter((m: any) => !m.esTemporal)

  const historial = Array.isArray(equipoData.historialPartidos) ? equipoData.historialPartidos : []
  const nuevoHistorial = [
    ...historial,
    {
      fecha: conv?.fecha || new Date().toISOString(),
      mvpId: partidoData.mvpId,
      stats: partidoData.stats,
      finalizadoEn: Date.now(),
    },
  ]

  // Acumular estadísticas históricas por jugador dentro del equipo
  const statsJugadoresActuales: Record<
    string,
    { goles: number; asistencias: number; partidosJugados: number; mvpCount: number }
  > = { ...(equipoData.estadisticasJugadores || {}) }

  const jugadoresQueJugaron = new Set<string>([
    ...(Array.isArray(conv?.confirmados) ? conv.confirmados : []),
    ...Object.keys(partidoData.stats || {}),
  ])

  // Identificar datos del MVP si fue seleccionado
  let mvpNombre: string | null = null
  let mvpEmoji: string | null = null
  if (partidoData.mvpId) {
    const m = members.find((x: any) => x.uid === partidoData.mvpId)
    if (m) {
      mvpNombre = m.name
      mvpEmoji = m.avatarUrl || '👑'
    } else {
      const r = Array.isArray(conv?.refuerzos)
        ? conv.refuerzos.find((x: any) => x.uid === partidoData.mvpId)
        : null
      if (r) {
        mvpNombre = r.nombre || r.name || 'Refuerzo'
        mvpEmoji = '⚡'
      }
    }
  }

  jugadoresQueJugaron.forEach((uid) => {
    const prev = statsJugadoresActuales[uid] || {
      goles: 0,
      asistencias: 0,
      partidosJugados: 0,
      mvpCount: 0,
    }
    const s = partidoData.stats?.[uid] || { goles: 0, asistencias: 0 }
    statsJugadoresActuales[uid] = {
      goles: (prev.goles || 0) + (s.goles || 0),
      asistencias: (prev.asistencias || 0) + (s.asistencias || 0),
      partidosJugados: (prev.partidosJugados || 0) + 1,
      mvpCount: (prev.mvpCount || 0) + (partidoData.mvpId === uid ? 1 : 0),
    }
  })

  // Guardar resumen del último partido para que la UI no quede vacía
  const ultimoPartido = {
    fecha: conv?.fecha || 'Último partido jugado',
    predioNombre: conv?.predioNombre || conv?.predio || 'Complejo Deportivo',
    canchaNombre: conv?.canchaNombre || conv?.cancha || 'Cancha',
    mvpId: partidoData.mvpId,
    mvpNombre,
    mvpEmoji,
    stats: partidoData.stats,
    finalizadoEn: Date.now(),
  }

  // Guardar documento individual en `estadisticas_partido` para cada jugador
  for (const uid of Array.from(jugadoresQueJugaron)) {
    const s = partidoData.stats?.[uid] || { goles: 0, asistencias: 0 }
    try {
      const statDocRef = doc(collection(db, COLECCIONES.estadisticasPartido))
      await setDoc(statDocRef, {
        id: statDocRef.id,
        equipoId,
        equipoNombre: equipoData.name || 'Equipo',
        jugadorUid: uid,
        partidoFecha: conv?.fecha || new Date().toISOString(),
        goles: s.goles || 0,
        asistencias: s.asistencias || 0,
        esMvp: partidoData.mvpId === uid,
        creadoEn: serverTimestamp(),
      })
    } catch (e) {
      console.warn('Error guardando estadistica de partido:', e)
    }
  }

  await updateDoc(eqRef, {
    members: miembrosPermanentes,
    convocatoria: null,
    ultimoPartido,
    estadisticasJugadores: statsJugadoresActuales,
    historialPartidos: nuevoHistorial,
  })
}

/**
 * Consulta todas las estadísticas de un jugador a través de partidos jugados.
 */
export const obtenerEstadisticasJugador = async (
  uid: string,
): Promise<{
  goles: number
  asistencias: number
  partidosJugados: number
  mvpCount: number
}> => {
  try {
    const q = query(
      collection(db, COLECCIONES.estadisticasPartido),
      where('jugadorUid', '==', uid),
    )
    const snap = await getDocs(q)
    let goles = 0
    let asistencias = 0
    let partidosJugados = 0
    let mvpCount = 0

    snap.forEach((d) => {
      const data = d.data()
      goles += data.goles || 0
      asistencias += data.asistencias || 0
      partidosJugados += 1
      if (data.esMvp) mvpCount += 1
    })

    return { goles, asistencias, partidosJugados, mvpCount }
  } catch (err) {
    console.warn('Error consultando estadisticas de jugador:', err)
    return { goles: 0, asistencias: 0, partidosJugados: 0, mvpCount: 0 }
  }
}