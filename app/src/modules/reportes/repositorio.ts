import { collection, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'
import type { CategoriaReporte, Reporte } from '@/domain'
import { COLECCIONES } from '@/core/config'
import { db } from '@/core/firebase'
import { ts } from '@/core/firestore'

const col = () => collection(db(), COLECCIONES.reportes)

export const reportarUsuario = async (
  reportanteUid: string,
  usuarioReportadoUid: string,
  categoria: CategoriaReporte,
  motivo: string,
): Promise<string> => {
  const refNuevo = doc(col())
  const reporte: Reporte = {
    id: refNuevo.id,
    reportanteUid,
    usuarioReportadoUid,
    categoria,
    motivo,
    estado: 'abierto',
    resueltoPor: null,
    resueltoAt: null,
    createdAt: ts(new Date()),
    deletedAt: null,
  }
  await setDoc(refNuevo, reporte)
  return refNuevo.id
}

export const listarReportesAbiertos = async (): Promise<Reporte[]> => {
  const snap = await getDocs(query(col(), where('estado', '==', 'abierto')))
  return snap.docs.map((d) => d.data() as Reporte).filter((r) => r.deletedAt === null)
}

export const resolverReporte = async (
  id: string,
  superadminUid: string,
  estado: 'resuelto' | 'descartado',
): Promise<void> => {
  await updateDoc(doc(col(), id), {
    estado,
    resueltoPor: superadminUid,
    resueltoAt: ts(new Date()),
  })
}