import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import type { Follow } from '@/domain'
import { COLECCIONES } from '@/core/config'
import { db } from '@/core/firebase'
import { auditoriaInicial, type Escritura } from '@/core/firestore'

/** Id determinista de la relacion: seguir dos veces es idempotente. */
const idFollow = (followerUid: string, followedUid: string): string =>
  `${followerUid}_${followedUid}`

/** Sigue a un jugador. Ignora el auto-seguimiento. */
export const seguir = async (followerUid: string, followedUid: string): Promise<void> => {
  if (followerUid === followedUid) return
  const ref = doc(db, COLECCIONES.follows, idFollow(followerUid, followedUid))
  const escritura: Escritura<Follow> = {
    id: ref.id,
    followerUid,
    followedUid,
    ...auditoriaInicial(),
  }
  await setDoc(ref, escritura)
}

/** Deja de seguir a un jugador. */
export const dejarDeSeguir = async (followerUid: string, followedUid: string): Promise<void> => {
  await deleteDoc(doc(db, COLECCIONES.follows, idFollow(followerUid, followedUid)))
}

/** Alterna seguir/dejar de seguir y devuelve el estado nuevo. */
export const alternarSeguir = async (
  followerUid: string,
  followedUid: string,
  siguiendoAhora: boolean,
): Promise<boolean> => {
  if (siguiendoAhora) {
    await dejarDeSeguir(followerUid, followedUid)
    return false
  }
  await seguir(followerUid, followedUid)
  return true
}

/** Escucha en tiempo real a quien sigue un usuario (lista de uids). */
export const escucharSiguiendo = (
  followerUid: string,
  onCambio: (uids: string[]) => void,
): Unsubscribe =>
  onSnapshot(
    query(collection(db, COLECCIONES.follows), where('followerUid', '==', followerUid)),
    (snap) => onCambio(snap.docs.map((d) => (d.data() as Follow).followedUid)),
    (err) => {
      console.warn('Error escuchando seguidos:', err)
      onCambio([])
    },
  )

/** Consulta puntual: ¿sigo a este jugador? */
export const estaSiguiendo = async (followerUid: string, followedUid: string): Promise<boolean> => {
  const snap = await getDoc(doc(db, COLECCIONES.follows, idFollow(followerUid, followedUid)))
  return snap.exists()
}
