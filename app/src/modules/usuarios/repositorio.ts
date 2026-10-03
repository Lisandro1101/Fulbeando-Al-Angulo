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
import type { GeoIndex, PerfilDeportivo, Rol, Usuario } from '@/domain'
import { COLECCIONES, appEnv } from '@/core/config'
import { db } from '@/core/firebase'
import { auditoriaInicial, auditoriaUpdate, type Escritura } from '@/core/firestore'
import { prefijosQueCubren, type Punto } from '@/core/geo/geohash'
import { haversineKm } from '@/core/geo/geohash'
import { aGeoIndex } from '@/core/geo'

const col = () => collection(db(), COLECCIONES.usuarios)
const ref = (uid: string) => doc(db(), COLECCIONES.usuarios, uid)

export interface AltaUsuario {
  uid: string
  nombre: string
  apellido: string
  email: string
  telefono?: string | null
  rol: Rol
  zona?: string | null
}

export const crearUsuario = async (alta: AltaUsuario): Promise<void> => {
  const existente = await getDoc(ref(alta.uid))
  if (existente.exists()) return

  const usuario: Escritura<Usuario> = {
    ...alta,
    telefono: alta.telefono ?? null,
    zona: alta.zona ?? null,
    whatsappVerificado: false,
    perfilDeportivo: null,
    geo: null,
    fotoUrl: null,
    estado: 'activo',
    ...auditoriaInicial(),
  }
  await setDoc(ref(alta.uid), usuario)
}

export const obtenerUsuario = async (uid: string): Promise<Usuario | null> => {
  const snap = await getDoc(ref(uid))
  return snap.exists() ? (snap.data() as Usuario) : null
}

/**
 * Alta idempotente desde Auth: no pisa un perfil ya existente ni su rol.
 * El primer ingreso de cada usuario tiene que existir antes que cualquier regla.
 */
export const asegurarUsuario = async (
  uid: string,
  perfil: { nombre: string; apellido: string; email: string },
  rolPorDefecto: Rol = 'jugador',
): Promise<void> => {
  const snap = await getDoc(ref(uid))
  if (snap.exists()) return

  const batch = writeBatch(db())
  batch.set(ref(uid), {
    ...perfil,
    rol: rolPorDefecto,
    telefono: null,
    whatsappVerificado: false,
    perfilDeportivo: null,
    geo: null,
    zona: null,
    fotoUrl: null,
    estado: 'activo',
    ...auditoriaInicial(),
  })
  await batch.commit()
}

export const actualizarPerfilDeportivo = async (
  uid: string,
  cambios: Partial<PerfilDeportivo>,
): Promise<void> => {
  await updateDoc(ref(uid), {
    perfilDeportivo: cambios,
    ...auditoriaUpdate(),
  })
}

export const actualizarZona = async (uid: string, zona: string | null): Promise<void> => {
  await updateDoc(ref(uid), { zona, ...auditoriaUpdate() })
}

/** Guardar ubicacion aproximada (la que el usuario acepta compartir). */
export const guardarGeo = async (
  uid: string,
  punto: Punto,
  radioKm: number = appEnv().radarRadioKm,
): Promise<GeoIndex> => {
  const geo = aGeoIndex(punto, radioKm)
  await updateDoc(ref(uid), { geo, ...auditoriaUpdate() })
  return geo
}

export const cambiarRol = async (uid: string, rol: Rol): Promise<void> => {
  await updateDoc(ref(uid), { rol, ...auditoriaUpdate() })
}

/** Baja logica. El documento queda para preservar historial y reputacion. */
export const darDeBaja = async (uid: string): Promise<void> => {
  await updateDoc(ref(uid), { estado: 'inactivo', ...auditoriaUpdate() })
}

/**
 * Radar de suplentes por proximidad: consulta las celdas geohash del radio y
 * despues filtra exacto por haversine (los indices no soportan radio).
 */
export const listarCandidatosRadar = async (
  punto: Punto,
  radioKm: number = appEnv().radarRadioKm,
): Promise<Array<Usuario & { distanciaKm: number }>> => {
  const prefijos = prefijosQueCubren(punto, radioKm, 5)
  const snap = await getDocs(
    query(
      col(),
      where('geo.prefijos', 'array-contains-any', prefijos),
      where('estado', '==', 'activo'),
      where('perfilDeportivo.disponibleHoy', '==', true),
      where('perfilDeportivo.notificacionesRadar', '==', true),
    ),
  )

  return snap.docs
    .map((d) => d.data() as Usuario)
    .filter((u) => u.geo !== null && u.deletedAt === null && u.rol === 'jugador')
    .map((u) => ({ ...u, distanciaKm: haversineKm(punto, u.geo as GeoIndex) }))
    .filter((u) => u.distanciaKm <= radioKm)
    .sort((a, b) => a.distanciaKm - b.distanciaKm)
}

export const listarUsuarios = async (): Promise<Usuario[]> => {
  const snap = await getDocs(query(col(), where('estado', '==', 'activo')))
  return snap.docs.map((d) => d.data() as Usuario)
}