import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
  type UserCredential,
} from 'firebase/auth'
import { auth } from '@/core/firebase'

export const proveedorGoogle = () => new GoogleAuthProvider()

export const ingresoConGoogle = (): Promise<User> => {
  fechaNacimientoDeAlta = null
  return signInWithPopup(auth, proveedorGoogle()).then((r) => r.user)
}

export const ingresoConEmail = (email: string, password: string): Promise<User> => {
  fechaNacimientoDeAlta = null
  return signInWithEmailAndPassword(auth, email, password).then((r) => r.user)
}

/**
 * Fecha de nacimiento capturada en el registro.
 *
 * Vive aca (y no en un `updateDoc` posterior) para que viaje en el MISMO
 * `batch.set` que crea el documento: registrar un usuario sale exactamente lo
 * mismo que antes, una sola escritura. Se setea ANTES de crear la cuenta porque
 * el observador de auth dispara apenas se valida el usuario, y si esperaramos
 * al `await` perderiamos el valor.
 */
let fechaNacimientoDeAlta: string | null = null

/** La consume `useSesion` al dar de alta el documento y la limpia. */
export const consumirFechaNacimientoDeAlta = (): string | null => {
  const pendiente = fechaNacimientoDeAlta
  fechaNacimientoDeAlta = null
  return pendiente
}

export const registroConEmail = async (
  nombre: string,
  apellido: string,
  email: string,
  password: string,
  fechaNacimiento?: string | null,
): Promise<User> => {
  fechaNacimientoDeAlta = fechaNacimiento ?? null
  let cred: UserCredential
  try {
    cred = await createUserWithEmailAndPassword(auth, email, password)
  } catch (err) {
    fechaNacimientoDeAlta = null
    throw err
  }
  await updateProfile(cred.user, { displayName: `${nombre} ${apellido}`.trim() })
  return cred.user
}

export const recuperarPassword = (email: string): Promise<void> => sendPasswordResetEmail(auth, email)

export const cerrarSesion = (): Promise<void> => signOut(auth)

export const observarSesion = (cb: (user: User | null) => void): (() => void) =>
  onAuthStateChanged(auth, cb)
