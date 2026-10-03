import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import type { CanchaResumen, DatosDeCobro, Predio } from '@/domain'
import { COLECCIONES, appEnv } from '@/core/config'
import { db } from '@/core/firebase'
import { auditoriaInicial, auditoriaUpdate, ts, type Escritura } from '@/core/firestore'
import { aGeoIndex } from '@/core/geo'
import type { Punto } from '@/core/geo/geohash'

const col = () => collection(db(), COLECCIONES.predios)
export const ref = (id: string) => doc(db(), COLECCIONES.predios, id)

export const normalizarBarrio = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export interface AltaPredio {
  nombre: string
  direccion: string
  barrio: string
  ciudad: string
  telefono: string
  fotos?: string[]
  cobro: DatosDeCobro
  duenoUid: string
  punto: Punto
}

export const crearPredio = async (alta: AltaPredio): Promise<string> => {
  const refNuevo = doc(col())
  const predio: Escritura<Predio> = {
    id: refNuevo.id,
    nombre: alta.nombre,
    direccion: alta.direccion,
    barrio: alta.barrio,
    ciudad: alta.ciudad,
    barrioNormalizado: normalizarBarrio(alta.barrio),
    geo: aGeoIndex(alta.punto, appEnv().radarRadioKm),
    telefono: alta.telefono,
    fotos: alta.fotos ?? [],
    cobro: alta.cobro,
    duenoUid: alta.duenoUid,
    canchasResumen: [],
    verificado: false,
    estado: 'activo',
    ...auditoriaInicial(),
  }
  await setDoc(refNuevo, predio)
  return refNuevo.id
}

export const obtenerPredio = async (id: string): Promise<Predio | null> => {
  const snap = await getDoc(ref(id))
  return snap.exists() ? (snap.data() as Predio) : null
}

export const actualizarPredio = async (
  id: string,
  cambios: Partial<Omit<Predio, 'id' | 'createdAt' | 'deletedAt'>>,
): Promise<void> => {
  await updateDoc(ref(id), { ...cambios, ...auditoriaUpdate() })
}

export const actualizarCobro = async (id: string, cobro: DatosDeCobro): Promise<void> => {
  await actualizarPredio(id, { cobro })
}

/**
 * Copia las canchas activas al predio para que el mapa publico se lea en una
 * sola query (las rules de escritura de canchas son del dueno, no del visitante).
 * Se llama desde el modulo de canchas en cada alta / edicion / baja.
 */
export const sincronizarResumenCanchas = async (
  predioId: string,
  canchasResumen: CanchaResumen[],
): Promise<void> => {
  await actualizarPredio(predioId, { canchasResumen })
}

/** Alta y verificacion de predios por parte del superadmin (PRD 2). */
export const verificarPredio = async (id: string, verificado: boolean): Promise<void> => {
  await actualizarPredio(id, { verificado })
}

/** Baja logica en cascada: predio + sus canchas. Sin borrado fisico. */
export const darDeBajaPredio = async (id: string): Promise<void> => {
  const canchas = await getDocs(collection(ref(id), COLECCIONES.canchas))
  const baja = ts(new Date())
  const batch = writeBatch(db())
  batch.update(ref(id), { estado: 'inactivo', deletedAt: baja, ...auditoriaUpdate() })
  for (const cancha of canchas.docs) {
    batch.update(cancha.ref, { activa: false, updatedAt: baja })
  }
  await batch.commit()
}

/** Listado publico: solo predios verificados y activos. */
export const listarPrediosPublicos = async (barrio?: string): Promise<Predio[]> => {
  const condiciones = [where('verificado', '==', true), where('estado', '==', 'activo')]
  if (barrio && barrio.trim().length > 0) {
    condiciones.push(where('barrioNormalizado', '==', normalizarBarrio(barrio)))
  }
  const snap = await getDocs(query(col(), ...condiciones))
  return snap.docs.map((d) => d.data() as Predio).filter((p) => p.deletedAt === null)
}

/**
 * Cola de verificacion del superadmin. `listarPrediosPublicos` no sirve aca
 * porque por definicion trae solo los ya verificados.
 */
export const listarPrediosParaVerificar = async (): Promise<Predio[]> => {
  const snap = await getDocs(
    query(col(), where('verificado', '==', false), where('estado', '==', 'activo')),
  )
  return snap.docs.map((d) => d.data() as Predio).filter((p) => p.deletedAt === null)
}

export const listarPrediosDelDueno = async (duenoUid: string): Promise<Predio[]> => {
  const snap = await getDocs(query(col(), where('duenoUid', '==', duenoUid)))
  return snap.docs.map((d) => d.data() as Predio).filter((p) => p.deletedAt === null)
}

/** Predios del usuario, para resolver permisos del lado cliente. */
export const idsDePredios = async (duenoUid: string): Promise<string[]> =>
  (await listarPrediosDelDueno(duenoUid)).map((p) => p.id)