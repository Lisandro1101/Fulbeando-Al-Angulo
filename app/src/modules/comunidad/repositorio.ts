import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import type {
  AltaPublicacion,
  Comentario,
  Publicacion,
  Reaccion,
  TipoReaccion,
} from '@/domain'
import { COLECCIONES, SUBCOLECCIONES } from '@/core/config'
import { db } from '@/core/firebase'
import { auditoriaInicial, type Escritura } from '@/core/firestore'

const col = () => collection(db, COLECCIONES.publicaciones)
const refPublicacion = (id: string) => doc(db, COLECCIONES.publicaciones, id)

/**
 * Publica en el muro de la comunidad (un post con fotos o una carta compartida).
 *
 * El snapshot de la carta viaja dentro del documento (ver `TarjetaSnapshot`):
 * el feed no recalcula nada, solo pinta lo que se guardo. Idempotencia no
 * aplica: publicar dos veces deja dos entradas (cada una es un documento nuevo).
 */
export const crearPublicacion = async (alta: AltaPublicacion): Promise<string> => {
  const ref = doc(col())
  const escritura: Escritura<Publicacion> = {
    id: ref.id,
    autorUid: alta.autorUid,
    autorNombre: alta.autorNombre,
    autorApodo: alta.autorApodo,
    autorFotoUrl: alta.autorFotoUrl,
    autorZona: alta.autorZona,
    autorMunicipio: alta.autorMunicipio,
    tipo: alta.tipo,
    texto: alta.texto ?? null,
    media: alta.media ?? [],
    reaccionesCount: 0,
    reacciones: {},
    comentariosCount: 0,
    ...auditoriaInicial(),
  }
  if (alta.tarjeta) escritura.tarjeta = alta.tarjeta
  await setDoc(ref, escritura)
  return ref.id
}

/** El autor retira su propia publicacion (las reglas solo dejan borrar lo propio). */
export const eliminarPublicacion = async (id: string): Promise<void> => {
  await deleteDoc(refPublicacion(id))
}

export type FiltroFeed = 'comunidad' | 'zona' | 'siguiendo'

export interface FeedContexto {
  /** Municipio/partido del jugador que mira el feed (filtro "Mi zona"). */
  municipio: string | null
  /** Uids a los que sigo (para el filtro "Siguiendo"). */
  siguiendo: string[]
  /** Mi propio uid: siempre veo lo mio en "Siguiendo". */
  miUid: string
}

/** Tope de uids que acepta `where(..., 'in', [...])` en Firestore. */
const MAX_IN = 10

/**
 * Escucha el muro en tiempo real, filtrado por la pestana elegida.
 *
 * - `comunidad`: todo el muro, cronologico.
 * - `zona`: solo posts cuyo autor es de mi municipio/partido (snapshot en
 *   `autorMunicipio`). Es el nivel pedido: mas amplio que el barrio.
 * - `siguiendo`: posts mios + de a quienes sigo (tope `MAX_IN` de Firestore).
 *
 * Cae a `comunidad` si el filtro no tiene datos suficientes (sin municipio o sin
 * seguir a nadie), para no dejar la pestana vacia sin explicacion.
 */
export const escucharFeed = (
  filtro: FiltroFeed,
  ctx: FeedContexto,
  onCambio: (publicaciones: Publicacion[]) => void,
  limite = 50,
): Unsubscribe => {
  const mapear = (snap: { docs: Array<{ id: string; data: () => unknown }> }) =>
    snap.docs.map((d) => ({ ...(d.data() as Publicacion), id: d.id }))

  if (filtro === 'zona' && ctx.municipio) {
    const q = query(
      col(),
      where('autorMunicipio', '==', ctx.municipio),
      orderBy('createdAt', 'desc'),
      limit(limite),
    )
    return onSnapshot(
      q,
      (snap) => onCambio(mapear(snap)),
      (err) => {
        console.warn('Error escuchando feed de zona:', err)
        onCambio([])
      },
    )
  }

  if (filtro === 'siguiendo' && ctx.siguiendo.length > 0) {
    const ids = Array.from(new Set([...ctx.siguiendo, ctx.miUid])).slice(0, MAX_IN)
    const q = query(
      col(),
      where('autorUid', 'in', ids),
      orderBy('createdAt', 'desc'),
      limit(limite),
    )
    return onSnapshot(
      q,
      (snap) => onCambio(mapear(snap)),
      (err) => {
        console.warn('Error escuchando feed de seguidos:', err)
        onCambio([])
      },
    )
  }

  const q = query(col(), orderBy('createdAt', 'desc'), limit(limite))
  return onSnapshot(
    q,
    (snap) => onCambio(mapear(snap)),
    (err) => {
      console.warn('Error escuchando el muro de la comunidad:', err)
      onCambio([])
    },
  )
}

/** Escucha la reaccion propia a una publicacion (`null` = no reaccione). */
export const escucharMiReaccion = (
  publicacionId: string,
  uid: string,
  onCambio: (tipo: TipoReaccion | null) => void,
): Unsubscribe =>
  onSnapshot(
    doc(db, COLECCIONES.publicaciones, publicacionId, SUBCOLECCIONES.reacciones, uid),
    (snap) => onCambio(snap.exists() ? ((snap.data() as Reaccion).tipo ?? null) : null),
    () => onCambio(null),
  )

/**
 * Reacciona (reacciones variadas). Si toco la misma reaccion, la saco; si toco
 * otra, la cambio. Mantiene el mapa de conteos y el total en el documento padre
 * dentro de una transaccion para que no se desincronicen con reacciones simultaneas.
 */
export const reaccionar = async (
  publicacionId: string,
  uid: string,
  tipo: TipoReaccion,
): Promise<void> => {
  const pubRef = refPublicacion(publicacionId)
  const reacRef = doc(db, COLECCIONES.publicaciones, publicacionId, SUBCOLECCIONES.reacciones, uid)

  await runTransaction(db, async (tx) => {
    const pubSnap = await tx.get(pubRef)
    if (!pubSnap.exists()) return

    const conteos: Record<string, number> = {
      ...((pubSnap.data() as Publicacion).reacciones ?? {}),
    }
    const reacSnap = await tx.get(reacRef)
    const previa = reacSnap.exists() ? ((reacSnap.data() as Reaccion).tipo ?? null) : null

    let delta = 0
    if (previa === tipo) {
      delete conteos[tipo]
      tx.delete(reacRef)
      delta = -1
    } else {
      if (previa) conteos[previa] = Math.max(0, (conteos[previa] ?? 0) - 1)
      else delta = 1
      conteos[tipo] = (conteos[tipo] ?? 0) + 1
      const escritura: Escritura<Reaccion> = {
        uid,
        tipo,
        ...auditoriaInicial(),
      }
      tx.set(reacRef, escritura)
    }

    tx.update(pubRef, {
      reacciones: conteos,
      reaccionesCount: increment(delta),
      updatedAt: serverTimestamp(),
    })
  })
}

/** Comenta una publicacion y sube el contador del documento padre. */
export const comentar = async (
  publicacionId: string,
  autor: { uid: string; nombre: string; apodo: string; fotoUrl: string | null },
  texto: string,
): Promise<void> => {
  const comRef = doc(collection(db, COLECCIONES.publicaciones, publicacionId, SUBCOLECCIONES.comentarios))
  const escritura: Escritura<Comentario> = {
    id: comRef.id,
    autorUid: autor.uid,
    autorNombre: autor.nombre,
    autorApodo: autor.apodo,
    autorFotoUrl: autor.fotoUrl,
    texto,
    ...auditoriaInicial(),
  }
  await setDoc(comRef, escritura)
  await updateDoc(refPublicacion(publicacionId), {
    comentariosCount: increment(1),
    updatedAt: serverTimestamp(),
  })
}

/** Lee los comentarios una sola vez (se usa al abrir la seccion de comentarios). */
export const listarComentarios = async (
  publicacionId: string,
  limite = 50,
): Promise<Comentario[]> => {
  const q = query(
    collection(db, COLECCIONES.publicaciones, publicacionId, SUBCOLECCIONES.comentarios),
    orderBy('createdAt', 'asc'),
    limit(limite),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...(d.data() as Comentario), id: d.id }))
}
