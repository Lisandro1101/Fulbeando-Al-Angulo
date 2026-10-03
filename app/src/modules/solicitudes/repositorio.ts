import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import type { EstadoSolicitud, SolicitudDueno, TipoCancha } from '@/domain'
import { editablePorUsuario } from '@/domain'
import { COLECCIONES } from '@/core/config'
import { db } from '@/core/firebase'
import { aMillis, auditoriaInicial, auditoriaUpdate, ts } from '@/core/firestore'
import { TransaccionInvalidaError } from '@/modules/turnos/repositorio'

const col = () => collection(db(), COLECCIONES.solicitudes)
const ref = (uid: string) => doc(db(), COLECCIONES.solicitudes, uid)
const refUsuario = (uid: string) => doc(db(), COLECCIONES.usuarios, uid)

export interface AltaSolicitudDueno {
  nombre: string
  apellido: string
  telefono: string
  email: string
  nombrePredio: string
  ciudad: string
  barrio: string
  tipoCancha: TipoCancha
  cantidadCanchas: number
  mensaje: string
}

export const obtenerSolicitud = async (uid: string): Promise<SolicitudDueno | null> => {
  const snap = await getDoc(ref(uid))
  return snap.exists() ? (snap.data() as SolicitudDueno) : null
}

/**
 * Envia (o reenvia) la solicitud de dueno. El documento se indexa por `uid`:
 * una sola solicitud viva por usuario, y reenviarla tras un rechazo no
 * duplica nada. El rol sigue siendo `jugador` hasta que apruebe el superadmin.
 */
export const solicitarDueno = async (uid: string, alta: AltaSolicitudDueno): Promise<void> => {
  const previa = await obtenerSolicitud(uid)
  if (previa !== null && !editablePorUsuario(previa)) {
    throw new TransaccionInvalidaError('Tu solicitud ya fue revisada.')
  }

  await setDoc(
    ref(uid),
    {
      ...alta,
      uid,
      estado: 'pendiente',
      revisadoPor: null,
      revisadoAt: null,
      motivoRechazo: null,
      deletedAt: null,
      // El merge conserva el `createdAt` original cuando es un reenvio.
      ...(previa === null ? auditoriaInicial() : auditoriaUpdate()),
    },
    { merge: true },
  )
}

export const listarSolicitudes = async (estado?: EstadoSolicitud): Promise<SolicitudDueno[]> => {
  const snap = await getDocs(
    estado === undefined ? query(col()) : query(col(), where('estado', '==', estado)),
  )
  return snap.docs
    .map((d) => d.data() as SolicitudDueno)
    .sort((a, b) => (aMillis(a.createdAt) ?? 0) - (aMillis(b.createdAt) ?? 0))
}

/**
 * Aprueba la solicitud y promueve el rol en la MISMA transaccion: o quedan
 * los dos escritos o no queda ninguno, para no dejar un dueno sin solicitud
 * aprobada ni una solicitud aprobada sin permisos reales.
 */
export const aprobarSolicitud = async (uid: string, revisadoPor: string): Promise<void> => {
  await runTransaction(db(), async (tx) => {
    const snapSolicitud = await tx.get(ref(uid))
    if (!snapSolicitud.exists()) throw new TransaccionInvalidaError('La solicitud no existe.')
    if ((snapSolicitud.data() as SolicitudDueno).estado !== 'pendiente') {
      throw new TransaccionInvalidaError('La solicitud ya fue revisada.')
    }

    const snapUsuario = await tx.get(refUsuario(uid))
    if (!snapUsuario.exists()) throw new TransaccionInvalidaError('El usuario no existe.')

    tx.update(ref(uid), {
      estado: 'aprobada',
      revisadoPor,
      revisadoAt: ts(new Date()),
      motivoRechazo: null,
      ...auditoriaUpdate(),
    })
    tx.update(refUsuario(uid), { rol: 'dueno_predio', ...auditoriaUpdate() })
  })
}

export const rechazarSolicitud = async (
  uid: string,
  revisadoPor: string,
  motivo: string,
): Promise<void> => {
  const texto = motivo.trim()
  if (texto.length === 0) throw new TransaccionInvalidaError('Explica el motivo del rechazo.')

  await updateDoc(ref(uid), {
    estado: 'rechazada',
    revisadoPor,
    revisadoAt: ts(new Date()),
    motivoRechazo: texto,
    ...auditoriaUpdate(),
  })
}

/** Cierre logico de una solicitud que el usuario ya no quiere seguir. */
export const retirarSolicitud = async (uid: string): Promise<void> => {
  await updateDoc(ref(uid), {
    estado: 'rechazada',
    motivoRechazo: 'Retirada por el usuario.',
    revisadoAt: ts(new Date()),
    ...auditoriaUpdate(),
  })
}
