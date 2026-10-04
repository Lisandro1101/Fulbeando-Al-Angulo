import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import type { Comprobante } from '@/domain'
import { MAX_BYTES_COMPROBANTE, storagePathComprobante } from '@/domain'
import { COLECCIONES } from '@/core/config'
import { db, storage } from '@/core/firebase'
import { ts } from '@/core/firestore'

const refDoc = (turnoId: string) => doc(db, COLECCIONES.comprobantes, turnoId)

export class ComprobanteInvalidoError extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'ComprobanteInvalidoError'
  }
}

export interface SubirImagenParams {
  turnoId: string
  organizadorUid: string
  archivo: File
}

export interface ImagenSubida {
  storagePath: string
  mimeType: string
  sizeBytes: number
  downloadUrl: string
}

/**
 * Sube la imagen de la transferencia a Storage. No toca Firestore: el registro
 * del comprobante lo escribe `solicitarTurno` dentro de la misma transaccion
 * que bloquea el turno, para que no exista una solicitud sin comprobante.
 * La validacion se repite en las rules de Storage.
 */
export const subirImagenComprobante = async (
  params: SubirImagenParams,
): Promise<ImagenSubida> => {
  if (!params.organizadorUid || params.organizadorUid === 'undefined') {
    throw new ComprobanteInvalidoError('Iniciá sesión para poder subir el comprobante de reserva.')
  }
  if (!params.archivo.type.startsWith('image/')) {
    throw new ComprobanteInvalidoError('El comprobante debe ser una imagen.')
  }
  if (params.archivo.size === 0 || params.archivo.size > MAX_BYTES_COMPROBANTE) {
    throw new ComprobanteInvalidoError('El comprobante supera los 5 MB.')
  }

  const nombre = `${Date.now()}-${params.archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const path = storagePathComprobante(params.turnoId, params.organizadorUid, nombre)
  const referencia = storageRef(storage, path)

  await uploadBytes(referencia, params.archivo, {
    contentType: params.archivo.type,
    customMetadata: { turnoId: params.turnoId, organizadorUid: params.organizadorUid },
  })

  return {
    storagePath: path,
    mimeType: params.archivo.type,
    sizeBytes: params.archivo.size,
    downloadUrl: await getDownloadURL(referencia),
  }
}

export const obtenerComprobante = async (turnoId: string): Promise<Comprobante | null> => {
  const snap = await getDoc(refDoc(turnoId))
  return snap.exists() ? (snap.data() as Comprobante) : null
}

/**
 * URL de descarga firmada para previsualizar el comprobante. Se pide on demand
 * en vez de guardarla: el token de la URL caduca y no debe persistirse.
 */
export const obtenerUrlComprobante = async (storagePath: string): Promise<string> =>
  getDownloadURL(storageRef(storage, storagePath))

export const marcarRevisado = async (
  turnoId: string,
  revisadoPor: string,
  verificado: boolean,
  motivoRechazo: string | null,
): Promise<void> => {
  await updateDoc(refDoc(turnoId), {
    revisadoPor,
    revisadoAt: ts(new Date()),
    verificado,
    motivoRechazo,
  })
}
