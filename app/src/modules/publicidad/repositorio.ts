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

// Sponsors predeterminados de muestra cuando aún no hay campañas en Firestore
export const ANUNCIOS_MUESTRA: AnuncioSponsor[] = [
  {
    id: 'sponsor-golazo-muro',
    nombreSponsor: 'Golazo Indumentaria',
    titulo: 'Camisetas personalizadas para tu equipo ⚽👕',
    descripcion: 'Equipá a tu plantel con telas térmicas Dry-Fit, escudos bordados y números oficiales. ¡15% OFF mencionando Fulbeando!',
    imagenUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80',
    logoUrl: '👕',
    enlaceDestino: 'https://wa.me/5491100000000?text=Hola!%20Vengo%20de%20Fulbeando%20y%20quiero%20cotizar%20camisetas%20para%20mi%20equipo',
    textoBoton: 'Pedir Presupuesto por WhatsApp',
    etiquetaBadge: 'Sponsor Oficial',
    ubicacion: 'muro',
    activo: true,
    clicks: 142,
    vistas: 980,
    creadoEn: Date.now() - 7 * 86400000,
  },
  {
    id: 'sponsor-tercer-tiempo-promo',
    nombreSponsor: 'Cervecería Tercer Tiempo 🍻',
    titulo: '2x1 en Pintas y 20% OFF en Pizzas Post-Partido 🍕',
    descripcion: 'Vení con tus compañeros de equipo con la app de Fulbeando después de jugar y disfrutá de promos exclusivas en mesas largas.',
    imagenUrl: 'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?auto=format&fit=crop&w=800&q=80',
    logoUrl: '🍻',
    enlaceDestino: 'https://wa.me/5491100000000?text=Hola!%20Vengo%20de%20Fulbeando%20y%20quiero%20reservar%20mesa%20para%20mi%20equipo',
    textoBoton: 'Reservar Mesa con Descuento',
    etiquetaBadge: 'Promo Tercer Tiempo',
    ubicacion: 'tercer_tiempo',
    activo: true,
    clicks: 89,
    vistas: 620,
    creadoEn: Date.now() - 5 * 86400000,
  },
  {
    id: 'sponsor-torneo-nocturno',
    nombreSponsor: 'Superliga Nocturna 🏆',
    titulo: 'Inscripciones Abiertas: Torneo F5 & F7',
    descripcion: 'Premios en efectivo, trofeos gigantes, árbitros colegiados y transmisión en streaming de las finales. ¡Anotá a tu equipo!',
    imagenUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
    logoUrl: '🏆',
    enlaceDestino: 'https://wa.me/5491100000000?text=Hola!%20Quiero%20inscribir%20mi%20equipo%20al%20torneo%20desde%20Fulbeando',
    textoBoton: 'Inscribir mi Equipo',
    etiquetaBadge: 'Torneo Destacado',
    ubicacion: 'muro',
    activo: true,
    clicks: 64,
    vistas: 410,
    creadoEn: Date.now() - 3 * 86400000,
  },
  {
    id: 'sponsor-radar-canchas',
    nombreSponsor: 'Botines Pro & Grip 👟⚡',
    titulo: '15% OFF en Calzado y Canilleras Fútbol 5 & 7',
    descripcion: 'Equipate antes de entrar a la cancha. Envíos en el día a complejos y predios de la zona.',
    imagenUrl: 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=800&q=80',
    logoUrl: '👟',
    enlaceDestino: 'https://wa.me/5491100000000?text=Hola!%20Vengo%20del%20Radar%20de%20Fulbeando%20y%20quiero%20el%2015%20off%20en%20botines',
    textoBoton: 'Pedir con 15% OFF',
    etiquetaBadge: 'Sponsor Radar',
    ubicacion: 'radar',
    activo: true,
    clicks: 110,
    vistas: 750,
    creadoEn: Date.now() - 2 * 86400000,
  },
]

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
          // Si aún no se cargaron en Firestore, usar los sponsors muestra correspondientes
          const filtradosMuestra = ANUNCIOS_MUESTRA.filter(
            (a) => a.activo && (ubicacion === 'todas' || a.ubicacion === ubicacion || a.ubicacion === 'global'),
          )
          onCambio(filtradosMuestra)
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
        // Fallback a los de muestra para no romper la UI
        const filtradosMuestra = ANUNCIOS_MUESTRA.filter(
          (a) => a.activo && (ubicacion === 'todas' || a.ubicacion === ubicacion || a.ubicacion === 'global'),
        )
        onCambio(filtradosMuestra)
      },
    )
  } catch (err) {
    console.warn('Error iniciando listener de anuncios:', err)
    const filtradosMuestra = ANUNCIOS_MUESTRA.filter(
      (a) => a.activo && (ubicacion === 'todas' || a.ubicacion === ubicacion || a.ubicacion === 'global'),
    )
    onCambio(filtradosMuestra)
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
      return ANUNCIOS_MUESTRA
    }
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AnuncioSponsor, 'id'>),
    }))
  } catch (err) {
    console.warn('Error cargando anuncios de Firestore:', err)
    return ANUNCIOS_MUESTRA
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
