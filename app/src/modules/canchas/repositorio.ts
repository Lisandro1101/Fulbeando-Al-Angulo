import { collection, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'
import type { Cancha, TipoCancha } from '@/domain'
import { COLECCIONES } from '@/core/config'
import { db } from '@/core/firebase'
import { ts } from '@/core/firestore'
import { sincronizarResumenCanchas } from '@/modules/predios/repositorio'

const sub = (predioId: string) => collection(db(), COLECCIONES.predios, predioId, COLECCIONES.canchas)
const ref = (predioId: string, canchaId: string) =>
  doc(db(), COLECCIONES.predios, predioId, COLECCIONES.canchas, canchaId)

export interface AltaCancha {
  nombre: string
  tipo: TipoCancha
  techada: boolean
  precioHora: number
}

export const crearCancha = async (predioId: string, alta: AltaCancha): Promise<string> => {
  const refNueva = doc(sub(predioId))
  const marca = ts(new Date())
  const cancha: Cancha = {
    id: refNueva.id,
    predioId,
    ...alta,
    activa: true,
    createdAt: marca,
    updatedAt: marca,
  }
  await setDoc(refNueva, cancha)
  await refrescarResumen(predioId)
  return refNueva.id
}

export const actualizarCancha = async (
  predioId: string,
  canchaId: string,
  cambios: Partial<Omit<Cancha, 'id' | 'predioId' | 'createdAt'>>,
): Promise<void> => {
  await updateDoc(ref(predioId, canchaId), { ...cambios, updatedAt: ts(new Date()) })
  await refrescarResumen(predioId)
}

/** Baja logica: se marca `activa: false`, nunca se borra el documento. */
export const desactivarCancha = async (predioId: string, canchaId: string): Promise<void> => {
  await actualizarCancha(predioId, canchaId, { activa: false })
}

export const listarCanchas = async (predioId: string): Promise<Cancha[]> => {
  const snap = await getDocs(query(sub(predioId), where('activa', '==', true)))
  return snap.docs.map((d) => d.data() as Cancha)
}

export const listarTodasLasCanchas = async (predioId: string): Promise<Cancha[]> => {
  const snap = await getDocs(sub(predioId))
  return snap.docs.map((d) => d.data() as Cancha)
}

/** Copia las canchas activas al predio para el listado publico y el mapa. */
const refrescarResumen = async (predioId: string): Promise<void> => {
  const canchas = await listarCanchas(predioId)
  await sincronizarResumenCanchas(
    predioId,
    canchas.map(({ id, nombre, tipo, techada, precioHora }) => ({
      id,
      nombre,
      tipo,
      techada,
      precioHora,
    })),
  )
}