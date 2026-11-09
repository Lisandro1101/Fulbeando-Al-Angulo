import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  increment,
} from 'firebase/firestore'
import { db } from '@/core/firebase'
import { COLECCIONES } from '@/core/config'
import type { AnuncioSponsor, UbicacionAnuncio } from '@/domain/publicidad'

// Sin anuncios predeterminados en código
export const ANUNCIOS_MUESTRA: AnuncioSponsor[] = []

const colPublicidades = () => collection(db, COLECCIONES.publicidades)

/**
 * Escucha anuncios activos en tiempo real para una ubicación específica.
 */
export const escucharAnunciosActivos = (
  ubicacion: UbicacionAnuncio | 'todas',
  onCambio: (anuncios: AnuncioSponsor[]) => void,
) => {
  let cancelado = false
  let unsub: (() => void) | null = null

  try {
    const constraints = [where('activo', '==', true)]
    if (ubicacion !== 'todas') {
      constraints.push(where('ubicacion', 'in', [ubicacion, 'global']))
    }

    const q = query(colPublicidades(), ...constraints)

    unsub = onSnapshot(
      q,
      (snap) => {
        if (cancelado) return
        if (snap.empty) {
          onCambio([])
          return
        }

        const lista: AnuncioSponsor[] = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<AnuncioSponsor, 'id'>),
        }))

        onCambio(lista)
      },
      (err) => {
        console.warn('Error escuchando anuncios:', err)
        if (cancelado) return
        onCambio([])
      },
    )
  } catch (err) {
    console.warn('Error iniciando listener de anuncios:', err)
    onCambio([])
  }

  return () => {
    cancelado = true
    setTimeout(() => {
      try {
        unsub?.()
      } catch (e) {
        console.warn('Error desuscribiendo anuncios:', e)
      }
    }, 50)
  }
}

/**
 * Obtiene todos los anuncios registrados (útil para el panel de administración).
 */
export const obtenerTodosLosAnuncios = async (): Promise<AnuncioSponsor[]> => {
  try {
    const snap = await getDocs(colPublicidades())
    if (snap.empty) {
      return []
    }
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AnuncioSponsor, 'id'>),
    }))
  } catch (err) {
    console.warn('Error cargando anuncios de Firestore:', err)
    return []
  }
}

/**
 * Registra un nuevo sponsor/campaña publicitaria.
 */
export const crearAnuncio = async (
  datos: Omit<AnuncioSponsor, 'id' | 'clicks' | 'vistas' | 'creadoEn'>,
): Promise<string> => {
  const docRef = doc(colPublicidades())
  const ahora = Date.now()
  const nuevo: AnuncioSponsor = {
    ...datos,
    id: docRef.id,
    clicks: 0,
    vistas: 0,
    creadoEn: ahora,
  }
  await setDoc(docRef, nuevo)
  return docRef.id
}

/**
 * Modifica o pausa un anuncio existente.
 */
export const actualizarAnuncio = async (
  id: string,
  cambios: Partial<AnuncioSponsor>,
): Promise<void> => {
  const docRef = doc(colPublicidades(), id)
  await updateDoc(docRef, {
    ...cambios,
    actualizadoEn: Date.now(),
  })
}

/**
 * Elimina un anuncio.
 */
export const eliminarAnuncio = async (id: string): Promise<void> => {
  const docRef = doc(colPublicidades(), id)
  await deleteDoc(docRef)
}

/**
 * Incrementa el contador de clics cuando el jugador presiona el botón del sponsor.
 */
export const registrarClickAnuncio = async (id: string): Promise<void> => {
  try {
    const docRef = doc(colPublicidades(), id)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      await updateDoc(docRef, {
        clicks: increment(1),
      })
    }
  } catch (e) {
    // Si es un anuncio de muestra en memoria, no hace falta que rompa
    console.debug('Click en anuncio registrado:', id)
  }
}

/**
 * Incrementa el contador de impresiones/vistas del anuncio.
 */
export const registrarVistaAnuncio = async (id: string): Promise<void> => {
  try {
    const docRef = doc(colPublicidades(), id)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      await updateDoc(docRef, {
        vistas: increment(1),
      })
    }
  } catch (e) {
    console.debug('Vista de anuncio registrada:', id)
  }
}
