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
} from 'firebase/auth'
import { auth } from '@/core/firebase'

export const proveedorGoogle = () => new GoogleAuthProvider()

export const ingresoConGoogle = (): Promise<User> =>
  signInWithPopup(auth(), proveedorGoogle()).then((r) => r.user)

export const ingresoConEmail = (email: string, password: string): Promise<User> =>
  signInWithEmailAndPassword(auth(), email, password).then((r) => r.user)

export const registroConEmail = async (
  nombre: string,
  apellido: string,
  email: string,
  password: string,
): Promise<User> => {
  const cred = await createUserWithEmailAndPassword(auth(), email, password)
  await updateProfile(cred.user, { displayName: `${nombre} ${apellido}`.trim() })
  return cred.user
}

export const recuperarPassword = (email: string): Promise<void> => sendPasswordResetEmail(auth(), email)

export const cerrarSesion = (): Promise<void> => signOut(auth())

export const observarSesion = (cb: (user: User | null) => void): (() => void) =>
  onAuthStateChanged(auth(), cb)